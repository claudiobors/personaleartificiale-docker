import { query } from "./db.mjs";
import { openRouter } from "./assistant.mjs";
import { createCalendarEvent, isCalendarConnected } from "./google-calendar.mjs";
import { appendToDriveFile, createDriveFile, isDriveConnected, searchDriveFiles } from "./google-drive.mjs";

const DIARY_DOC_NAME = "Assistente - I tuoi viaggi";

const TRAVEL_TRIGGER_PATTERN = /\b(pianifica (un )?viaggio|organizza (un )?viaggio|cerca (dei )?voli|voglio andare (a|in)|prenota (un )?viaggio|aiutami con un viaggio|aiutami a organizzare un viaggio)\b/i;
const CONFIRM_WORDS = ["si", "sì", "ok", "va bene", "confermo", "procedi", "prenota pure"];
const CANCEL_WORDS = ["annulla", "cancella", "niente", "lascia stare", "no grazie"];

function model() {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

function isConfirmation(text) {
  const normalized = text.trim().toLowerCase();
  return CONFIRM_WORDS.some((word) => normalized === word || normalized.includes(word));
}

function isCancellation(text) {
  const normalized = text.trim().toLowerCase();
  return CANCEL_WORDS.some((word) => normalized === word || normalized.includes(word));
}

async function getOpenPlan(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM travel_plans WHERE user_id = $1 AND channel = $2 AND channel_ref = $3
     AND status IN ('collecting', 'proposed', 'awaiting_confirmation') ORDER BY updated_at DESC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

// LL-34: buffer di trasferimento aeroportuale calibrati su area Schengen/extra-Schengen e dimensione aeroporto.
// Stima "human-grade" basata su prassi aeroportuale comune, non un servizio esterno verificabile via API.
function transferBufferMinutes({ isSchengen, airportSize }) {
  if (isSchengen) {
    if (airportSize === "hub") return 120;
    if (airportSize === "small") return 75;
    return 100;
  }
  if (airportSize === "hub") return 210;
  if (airportSize === "small") return 150;
  return 180;
}

function googleFlightsLink({ origin, destination, departDate, returnDate }) {
  let q = `Voli da ${origin} a ${destination} il ${departDate}`;
  if (returnDate) q += ` di ritorno il ${returnDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

function mapsLink(searchText) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`;
}

function tripadvisorHotelsLink(destination) {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`hotel ${destination}`)}`;
}

const SCHEMA_INTAKE = `{"complete": boolean, "nextQuestion": string|null, "origin": string|null, "destination": string|null, "departDate": "YYYY-MM-DD"|null, "returnDate": "YYYY-MM-DD"|null, "travelers": number|null, "originIsSchengen": boolean|null, "originAirportSize": "hub"|"large"|"small"|null, "destinationIsSchengen": boolean|null, "destinationAirportSize": "hub"|"large"|"small"|null}`;

function intakePrompt() {
  return (
    "Sei un assistente di viaggio che raccoglie i dati per pianificare un viaggio: città/aeroporto di partenza, destinazione, " +
    "data di andata, data di ritorno (se prevista), numero di viaggiatori. Usando la tua conoscenza geografica indica anche se l'aeroporto " +
    "di partenza e quello di destinazione sono nell'area Schengen (originIsSchengen/destinationIsSchengen) e la loro dimensione approssimativa " +
    "(\"hub\" = grande scalo internazionale, \"large\" = aeroporto nazionale/regionale importante, \"small\" = aeroporto piccolo/secondario). " +
    "Fai una domanda alla volta, tono amichevole e pratico. Quando hai i dati principali (partenza, destinazione, data di andata), imposta complete a true."
  );
}

async function callTravel(systemPrompt, history, schemaHint) {
  const messages = [
    { role: "system", content: `${systemPrompt}\n\nRispondi SOLO con un oggetto JSON valido, senza altro testo, in questa forma esatta: ${schemaHint}` },
    ...history,
  ];
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages,
    max_tokens: 700,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices?.[0]?.message?.content || "{}");
}

export async function handleTravelMessage(user, text, { channel, channelRef }) {
  const open = await getOpenPlan(user.id, channel, channelRef);
  if (open) return continuePlan(user, open, text);

  if (!TRAVEL_TRIGGER_PATTERN.test(text)) return null;
  return startPlan(user, text, { channel, channelRef });
}

async function startPlan(user, text, { channel, channelRef }) {
  const row = (
    await query(
      `INSERT INTO travel_plans (user_id, channel, channel_ref, status, interview_history)
       VALUES ($1, $2, $3, 'collecting', '[]'::jsonb) RETURNING *`,
      [user.id, channel, channelRef],
    )
  ).rows[0];
  return stepIntake(user, row, text);
}

async function stepIntake(user, row, text) {
  const history = [...(row.interview_history || []), { role: "user", content: text }];
  const extracted = await callTravel(intakePrompt(), history, SCHEMA_INTAKE).catch((error) => {
    console.error("[travel] estrazione intake fallita", user.id, error?.message || error);
    return null;
  });
  if (!extracted) return "Non riesco a elaborare la richiesta sul viaggio in questo momento, riprova tra poco.";

  const merged = {
    origin: extracted.origin || row.origin,
    destination: extracted.destination || row.destination,
    departDate: extracted.departDate || row.depart_date,
    returnDate: extracted.returnDate || row.return_date,
    travelers: extracted.travelers ?? row.travelers ?? 1,
  };
  const geo = {
    originIsSchengen: extracted.originIsSchengen ?? row.geo_info?.originIsSchengen ?? null,
    originAirportSize: extracted.originAirportSize || row.geo_info?.originAirportSize || null,
    destinationIsSchengen: extracted.destinationIsSchengen ?? row.geo_info?.destinationIsSchengen ?? null,
    destinationAirportSize: extracted.destinationAirportSize || row.geo_info?.destinationAirportSize || null,
  };

  if (!extracted.complete || !merged.origin || !merged.destination || !merged.departDate) {
    const transcript = [...(row.interview_history || []), { role: "user", content: text }, { role: "assistant", content: extracted.nextQuestion || "" }];
    await query(
      `UPDATE travel_plans SET origin = $1, destination = $2, depart_date = $3, return_date = $4, travelers = $5, geo_info = $6::jsonb, interview_history = $7::jsonb, updated_at = NOW() WHERE id = $8`,
      [merged.origin, merged.destination, merged.departDate || null, merged.returnDate || null, merged.travelers, JSON.stringify(geo), JSON.stringify(transcript), row.id],
    );
    return extracted.nextQuestion || "Raccontami di più sul viaggio che hai in mente.";
  }

  return proposePlan(user, { ...row, ...merged, geo_info: geo });
}

async function proposePlan(user, row) {
  const flightsUrl = googleFlightsLink({ origin: row.origin, destination: row.destination, departDate: row.departDate || row.depart_date, returnDate: row.returnDate || row.return_date });
  const mapsUrl = mapsLink(row.destination);
  const hotelsUrl = tripadvisorHotelsLink(row.destination);

  const originBuffer = transferBufferMinutes({ isSchengen: row.geo_info.originIsSchengen, airportSize: row.geo_info.originAirportSize });
  const returnBuffer = transferBufferMinutes({ isSchengen: row.geo_info.destinationIsSchengen, airportSize: row.geo_info.destinationAirportSize });

  await query(
    `UPDATE travel_plans SET status = 'proposed', origin = $1, destination = $2, depart_date = $3, return_date = $4, travelers = $5, geo_info = $6::jsonb, updated_at = NOW() WHERE id = $7`,
    [row.origin, row.destination, row.departDate || row.depart_date, row.returnDate || row.return_date, row.travelers, JSON.stringify(row.geo_info), row.id],
  );

  const returnLine = (row.returnDate || row.return_date)
    ? `Per il ritorno (${row.returnDate || row.return_date}) considera di essere in aeroporto con circa ${returnBuffer} minuti di anticipo (area ${row.geo_info.destinationIsSchengen ? "Schengen" : "extra-Schengen"}).`
    : "";

  return (
    `Ecco cosa ho preparato per ${row.origin} → ${row.destination}:\n\n` +
    `✈️ Voli: ${flightsUrl}\n` +
    `🏨 Hotel (TripAdvisor): ${hotelsUrl}\n` +
    `🗺️ Mappa di ${row.destination}: ${mapsUrl}\n\n` +
    `Per la partenza (${row.departDate || row.depart_date}) ti consiglio di essere in aeroporto con circa ${originBuffer} minuti di anticipo (area ${row.geo_info.originIsSchengen ? "Schengen" : "extra-Schengen"}). ${returnLine}\n\n` +
    `Vuoi che ti prepari già dei promemoria in calendario per queste date? Ti chiederò poi la foto della conferma di prenotazione per aggiornarli con gli orari reali del volo.`
  );
}

async function continuePlan(user, row, text) {
  if (row.status === "collecting") return stepIntake(user, row, text);

  if (isCancellation(text)) {
    await query(`UPDATE travel_plans SET status = 'abandoned', updated_at = NOW() WHERE id = $1`, [row.id]);
    return "Va bene, non ho creato nulla in calendario per questo viaggio.";
  }
  if (!isConfirmation(text)) {
    return 'Vuoi che prepari i promemoria in calendario per questo viaggio? Rispondi "sì" per confermare o "annulla" per lasciar perdere.';
  }

  const calendarConnected = await isCalendarConnected(user.id);
  if (!calendarConnected) {
    await query(`UPDATE travel_plans SET status = 'awaiting_confirmation', updated_at = NOW() WHERE id = $1`, [row.id]);
    return "Non ho un Google Calendar collegato quindi non posso creare promemoria automatici, ma tieni pure i link che ti ho mandato. Quando prenoti, mandami una foto della conferma e aggiornerò comunque i tuoi appunti di viaggio.";
  }

  const eventIds = [];
  try {
    const departEvent = await createCalendarEvent(user.id, {
      summary: `Partenza per ${row.destination}`,
      description: `Promemoria automatico del tuo assistente. Buffer aeroportuale consigliato: ${transferBufferMinutes({ isSchengen: row.geo_info?.originIsSchengen, airportSize: row.geo_info?.originAirportSize })} minuti prima del volo. Verrà aggiornato con l'orario reale quando mi mandi la conferma di prenotazione.`,
      start: `${row.depart_date}T08:00:00`,
      end: `${row.depart_date}T09:00:00`,
    });
    eventIds.push(departEvent.id);
    if (row.return_date) {
      const returnEvent = await createCalendarEvent(user.id, {
        summary: `Ritorno da ${row.destination}`,
        description: `Promemoria automatico del tuo assistente. Buffer aeroportuale consigliato: ${transferBufferMinutes({ isSchengen: row.geo_info?.destinationIsSchengen, airportSize: row.geo_info?.destinationAirportSize })} minuti prima del volo. Verrà aggiornato con l'orario reale quando mi mandi la conferma di prenotazione.`,
        start: `${row.return_date}T08:00:00`,
        end: `${row.return_date}T09:00:00`,
      });
      eventIds.push(returnEvent.id);
    }
  } catch (error) {
    console.error("[travel] creazione eventi calendario fallita", user.id, error?.message || error);
    return "Non sono riuscito a creare i promemoria in calendario, ma i link per voli e hotel restano validi.";
  }

  await query(`UPDATE travel_plans SET status = 'awaiting_confirmation', calendar_event_ids = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
    JSON.stringify(eventIds),
    row.id,
  ]);
  return "Fatto, ho messo dei promemoria di massima in calendario (orari indicativi). Quando prenoti davvero, mandami una foto o uno screenshot della conferma: aggiornerò gli orari e ti preparerò un recap pratico del viaggio.";
}

export async function handleTravelImageMessage(user, buffer, mimetype, { channel, channelRef }) {
  const row = await getOpenPlan(user.id, channel, channelRef);
  if (!row || (row.status !== "proposed" && row.status !== "awaiting_confirmation")) return null;

  let extracted;
  try {
    extracted = await extractBookingDetails(buffer, mimetype);
  } catch (error) {
    console.error("[travel] estrazione conferma prenotazione fallita", user.id, error?.message || error);
    return "Ho ricevuto l'immagine ma non sono riuscito a leggere i dettagli della prenotazione. Puoi scrivermeli in testo?";
  }

  await updateCalendarFromBooking(user, row, extracted).catch((error) => {
    console.error("[travel] aggiornamento calendario da prenotazione fallito", user.id, error?.message || error);
  });

  await query(`UPDATE travel_plans SET status = 'booked', selected_flight = $1::jsonb, selected_hotel = $2::jsonb, updated_at = NOW() WHERE id = $3`, [
    JSON.stringify(extracted.flight || null),
    JSON.stringify(extracted.hotel || null),
    row.id,
  ]);

  const recap = await buildTravelRecap(row, extracted).catch((error) => {
    console.error("[travel] generazione recap fallita", user.id, error?.message || error);
    return null;
  });

  await writeTravelDiaryEntry(user, row, extracted).catch((error) => {
    console.error("[travel] scrittura diario Drive fallita", user.id, error?.message || error);
  });

  return recap || "Ho registrato la tua prenotazione e aggiornato il calendario dove possibile.";
}

async function extractBookingDetails(buffer, mimetype) {
  const visionModel = process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o-mini";
  const completion = await openRouter().chat.completions.create({
    model: visionModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Questa immagine è una conferma di prenotazione di volo o hotel. Estrai i dettagli reali che trovi. " +
              'Rispondi SOLO con JSON valido in questa forma: {"flight": {"airline": string|null, "flightNumber": string|null, "departureAirport": string|null, "arrivalAirport": string|null, "departureDateTime": "YYYY-MM-DDTHH:MM:SS"|null, "arrivalDateTime": "YYYY-MM-DDTHH:MM:SS"|null}|null, "hotel": {"name": string|null, "address": string|null, "checkIn": "YYYY-MM-DD"|null, "checkOut": "YYYY-MM-DD"|null}|null}. Se un campo non è leggibile lascialo null.',
          },
          { type: "image_url", image_url: { url: `data:${mimetype};base64,${buffer.toString("base64")}` } },
        ],
      },
    ],
    max_tokens: 600,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices?.[0]?.message?.content || "{}");
}

async function updateCalendarFromBooking(user, row, extracted) {
  const connected = await isCalendarConnected(user.id);
  if (!connected) return;
  if (extracted.flight?.departureDateTime) {
    await createCalendarEvent(user.id, {
      summary: `Volo ${extracted.flight.airline || ""} ${extracted.flight.flightNumber || ""} — ${row.origin} → ${row.destination}`.trim(),
      description: `Orario confermato dalla prenotazione. Da: ${extracted.flight.departureAirport || row.origin}. A: ${extracted.flight.arrivalAirport || row.destination}.`,
      start: extracted.flight.departureDateTime,
      end: extracted.flight.arrivalDateTime || extracted.flight.departureDateTime,
    });
  }
  if (extracted.hotel?.checkIn) {
    await createCalendarEvent(user.id, {
      summary: `Check-in ${extracted.hotel.name || "hotel"}`,
      description: extracted.hotel.address || "",
      start: `${extracted.hotel.checkIn}T14:00:00`,
      end: `${extracted.hotel.checkIn}T15:00:00`,
    });
  }
}

async function buildTravelRecap(row, extracted) {
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          "Scrivi un breve recap pratico di viaggio in italiano per l'utente, tono amichevole e concreto (non un elenco freddo). " +
          "Includi, se pertinenti per la destinazione, promemoria pratici realistici: documento richiesto (carta d'identità o passaporto), valuta locale, tipo di presa elettrica, fuso orario rispetto all'Italia. " +
          "Massimo 120 parole. Chiarisci che sono indicazioni di massima da verificare.",
      },
      { role: "user", content: `Viaggio da ${row.origin} a ${row.destination}. Dettagli prenotazione: ${JSON.stringify(extracted)}` },
    ],
    max_tokens: 400,
  });
  return completion.choices?.[0]?.message?.content?.trim();
}

// LL-25 stile narrativo, coerente con gli altri diari (Coach/Triage): scrittura automatica, senza approvazione.
async function writeTravelDiaryEntry(user, row, extracted) {
  const connected = await isDriveConnected(user.id);
  if (!connected) return null;
  const existing = (await searchDriveFiles(user.id, DIARY_DOC_NAME, 3)).find((file) => file.name === DIARY_DOC_NAME);

  const context = `Viaggio: ${row.origin} → ${row.destination}, andata ${row.depart_date}${row.return_date ? `, ritorno ${row.return_date}` : ""}. Dettagli prenotazione confermati: ${JSON.stringify(extracted)}.`;
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          "Scrivi UNA voce di diario in italiano, in prima persona, in formato narrativo umano (mai elenco puntato), che racconta questo viaggio appena prenotato. Massimo 100 parole, inizia con la data odierna leggibile.",
      },
      { role: "user", content: context },
    ],
    max_tokens: 300,
  });
  const entryText = completion.choices?.[0]?.message?.content?.trim();
  if (!entryText) return null;

  if (existing) {
    await appendToDriveFile(user.id, { fileId: existing.id, name: existing.name, addition: entryText });
  } else {
    await createDriveFile(user.id, { name: DIARY_DOC_NAME, content: `Questi sono i tuoi viaggi, raccontati dal tuo assistente personale.\n\n${entryText}` });
  }
  return entryText;
}
