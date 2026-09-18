import { createCalendarEvent, isSlotAvailable, proposeSlots } from "./google-calendar.mjs";
import { formatSlot, formatSlotList } from "./booking.mjs";
import { registerSkill } from "./skills.mjs";

// Complementare al flusso a parole chiave di booking.mjs (che propone una lista numerata di orari):
// questa skill copre le richieste formulate liberamente durante la conversazione, es. "vedi se sono
// libero venerdì pomeriggio" o "fissa una chiamata con Marco martedì alle 15", dove l'utente indica
// già un giorno/orario invece di scegliere da un elenco.

async function handleCalendarioOrariDisponibili(args, context) {
  let slots;
  try {
    slots = await proposeSlots(context.userId, {
      durationMinutes: Number(args.durationMinutes) || 60,
      daysAhead: Math.min(Math.max(Number(args.daysAhead) || 7, 1), 30),
      count: Math.min(Math.max(Number(args.count) || 3, 1), 8),
    });
  } catch (error) {
    console.error("[calendar-skills] calcolo disponibilità fallito", context.userId, error?.message || error);
    return { message: "Non riesco a controllare il calendario in questo momento." };
  }
  if (!slots.length) return { message: "Non trovo orari liberi nel periodo richiesto." };
  return { message: `Orari liberi:\n${formatSlotList(slots)}` };
}

registerSkill("calendario_orari_disponibili", {
  description: "Controlla il Google Calendar collegato e restituisce i prossimi orari liberi in orario lavorativo, per proporli all'utente.",
  parameters: {
    type: "object",
    properties: {
      durationMinutes: { type: "number", description: "Durata dell'appuntamento in minuti (default 60)" },
      daysAhead: { type: "number", description: "Quanti giorni in avanti guardare (default 7)" },
      count: { type: "number", description: "Quanti orari proporre (default 3)" },
    },
  },
  needsApproval: false,
  requiresIntegration: "google_calendar",
  handler: handleCalendarioOrariDisponibili,
});

function parseRange(args) {
  const start = new Date(args.start);
  if (Number.isNaN(start.getTime())) return null;
  const end = args.end ? new Date(args.end) : new Date(start.getTime() + (Number(args.durationMinutes) || 60) * 60_000);
  if (Number.isNaN(end.getTime()) || end <= start) return null;
  return { start, end };
}

async function previewCalendarioCreaAppuntamento(args, context) {
  const range = parseRange(args);
  if (!range) return 'Non ho capito bene data e ora dell\'appuntamento: puoi indicarmele in modo più preciso (es. "martedì 10 marzo alle 15")?';
  const free = await isSlotAvailable(context.userId, { start: range.start.toISOString(), end: range.end.toISOString() }).catch(() => true);
  if (!free) return `In quell'orario (${formatSlot({ start: range.start })}) risulti già occupato sul calendario: vuoi che ti proponga altri orari liberi?`;
  return `Sto per creare l'appuntamento "${args.summary || "Appuntamento"}" per ${formatSlot({ start: range.start })}${args.attendeeEmail ? ` con invito a ${args.attendeeEmail}` : ""}.\n\nConfermi? (sì/no)`;
}

async function handleCalendarioCreaAppuntamento(args, context) {
  const range = parseRange(args);
  if (!range) return { message: "Non ho capito bene data e ora dell'appuntamento: puoi indicarmele di nuovo?" };
  const free = await isSlotAvailable(context.userId, { start: range.start.toISOString(), end: range.end.toISOString() }).catch(() => true);
  if (!free) return { message: "In quell'orario risulti già occupato sul calendario: prova a proporne un altro." };
  try {
    await createCalendarEvent(context.userId, {
      summary: args.summary || "Appuntamento",
      description: args.description || "",
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      attendeeEmail: args.attendeeEmail || null,
    });
  } catch (error) {
    console.error("[calendar-skills] creazione evento fallita", context.userId, error?.message || error);
    return { message: "Non sono riuscito a creare l'appuntamento sul calendario." };
  }
  return { message: `Fatto! Appuntamento "${args.summary || "Appuntamento"}" confermato per ${formatSlot({ start: range.start })}.` };
}

registerSkill("calendario_crea_appuntamento", {
  description:
    "Crea un evento su Google Calendar in una data e ora precise indicate dall'utente (non per scegliere tra orari proposti: in quel caso usa il flusso di prenotazione guidata). " +
    "Controlla sempre prima la disponibilità reale e non crea mai un doppio impegno.",
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Titolo breve dell'appuntamento" },
      description: { type: "string", description: "Dettagli aggiuntivi" },
      start: { type: "string", description: "Data e ora di inizio in formato ISO 8601 (es. 2026-03-10T15:00:00+01:00)" },
      end: { type: "string", description: "Data e ora di fine in formato ISO 8601, se assente si usa durationMinutes" },
      durationMinutes: { type: "number", description: "Durata in minuti se 'end' non è indicato (default 60)" },
      attendeeEmail: { type: "string", description: "Email di un partecipante da invitare, se indicata dall'utente" },
    },
    required: ["summary", "start"],
  },
  needsApproval: true,
  preview: previewCalendarioCreaAppuntamento,
  handler: handleCalendarioCreaAppuntamento,
  requiresIntegration: "google_calendar",
});
