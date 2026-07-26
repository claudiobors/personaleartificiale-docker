import { query } from "./db.mjs";
import { openRouter } from "./assistant.mjs";
import { appendToDriveFile, createDriveFile, isDriveConnected, readDriveFileText, searchDriveFiles } from "./google-drive.mjs";

const DIARY_DOC_NAME = "Assistente - Storico Obiettivi";
const REVIEW_INTERVAL_DAYS = Number(process.env.COACH_REVIEW_INTERVAL_DAYS || 7);

const COACH_TRIGGER_PATTERN = /\b(voglio (raggiungere|fissare|darmi) un obiettivo|ho un obiettivo|aiutami a (pianificare|raggiungere|definire) un obiettivo|fammi da coach|voglio un coach|voglio fissarmi un obiettivo)\b/i;
const ACCEPT_ANYWAY_PATTERN = /\b(va bene comunque|procedi comunque|tienilo cos[iì]|lascia (stare|pure) cos[iì]|ok comunque|accetto il rischio|confermo cos[iì]|vai comunque)\b/i;
const GOAL_ACHIEVED_PATTERN = /\b(ce l'ho fatta|obiettivo raggiunto|l'ho completat|ho finito|missione compiuta)\b/i;
const GOAL_ABANDON_PATTERN = /\b(lascio perdere|abbandono l'obiettivo|non mi interessa pi[uù]|rinuncio all'obiettivo|voglio smettere)\b/i;

function model() {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

async function callCoach(systemPrompt, history, schemaHint) {
  const messages = [
    {
      role: "system",
      content: `${systemPrompt}\n\nRispondi SOLO con un oggetto JSON valido, senza altro testo, in questa forma esatta: ${schemaHint}`,
    },
    ...history,
  ];
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages,
    max_tokens: 700,
    response_format: { type: "json_object" },
  });
  const raw = completion.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw);
}

async function getGoalByStatus(userId, channel, channelRef, status) {
  const result = await query(
    `SELECT * FROM coach_goals WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND status = $4 ORDER BY updated_at DESC LIMIT 1`,
    [userId, channel, channelRef, status],
  );
  return result.rows[0] || null;
}

async function getDueReview(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM coach_goals WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND status = 'active' AND next_review_at <= NOW() ORDER BY next_review_at ASC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

function computeRealityCheck({ totalQuantity, capacityPerPeriod, periodDays, deadlineAt }) {
  if (!totalQuantity || !capacityPerPeriod || !periodDays || !deadlineAt) return null;
  const daysRemaining = Math.max(1, Math.ceil((new Date(deadlineAt) - new Date()) / 86_400_000));
  const requiredPerDay = totalQuantity / daysRemaining;
  const capacityPerDay = capacityPerPeriod / periodDays;
  const ratio = capacityPerDay > 0 ? requiredPerDay / capacityPerDay : Infinity;
  return { daysRemaining, requiredPerDay, capacityPerDay, ratio, feasible: ratio <= 1.05 };
}

function realityCheckMessage(realityCheck, { wish, unit, deadlineAt }) {
  const req = realityCheck.requiredPerDay.toFixed(1);
  const cap = realityCheck.capacityPerDay.toFixed(1);
  if (realityCheck.feasible) {
    return `Reality check: per "${wish}" entro il ${deadlineAt} ti servono circa ${req} ${unit || "unità"} al giorno, e mi hai detto di poterne dedicare circa ${cap}: il ritmo regge. `;
  }
  const times = realityCheck.ratio.toFixed(1);
  return (
    `Reality check: per arrivare a "${wish}" entro il ${deadlineAt} dovresti fare circa ${req} ${unit || "unità"} al giorno, ma mi hai detto di poterne dedicare realisticamente solo ${cap} al giorno — ` +
    `sono circa ${times}x il ritmo che riesci a sostenere. La deadline attuale non è realistica così com'è. ` +
    `Vuoi allungare la scadenza, ridurre l'obiettivo, aumentare il tempo che ci dedichi, oppure procedere comunque sapendo il rischio?`
  );
}

const SCHEMA1 = `{"phaseComplete": boolean, "nextQuestion": string|null, "wish": string|null, "motivation": string|null}`;
const SCHEMA2 = `{"phaseComplete": boolean, "nextQuestion": string|null, "outcome": string|null, "obstacle": string|null, "deadlineAt": "YYYY-MM-DD"|null, "totalQuantity": number|null, "unit": string|null, "capacityPerPeriod": number|null, "periodDays": number|null}`;
const SCHEMA3 = `{"phaseComplete": boolean, "nextQuestion": string|null, "processGoal": string|null, "ifThenPlan": string|null}`;

function phase1Prompt() {
  return (
    "Sei un coach personale che conduce la PRIMA fase di un colloquio per aiutare l'utente a definire un obiettivo (metodo MCII di Gabriele Oettingen). " +
    "In questa fase devi far emergere: (1) 'wish', il desiderio/obiettivo concreto che vuole raggiungere; (2) 'motivation', perché è importante per lui/lei ORA. " +
    "Fai una domanda alla volta, tono caldo e umano da coach personale, mai robotico o burocratico. " +
    "Quando hai raccolto entrambe le informazioni in modo chiaro e specifico, imposta phaseComplete a true."
  );
}

function phase2Prompt({ wish, motivation }) {
  return (
    `Sei nella SECONDA fase (mental contrasting, metodo MCII). L'utente vuole: "${wish}" perché: "${motivation}". ` +
    "Ora devi far emergere: (1) 'outcome', come sarebbe vissuta la vita/il risultato se l'obiettivo fosse raggiunto, in modo vivido; " +
    "(2) 'obstacle', il principale ostacolo INTERNO/personale (un comportamento, pensiero o abitudine dell'utente, non un fattore esterno) che oggi lo frena; " +
    "(3) dati per un reality check matematico sulla scadenza: la quantità totale necessaria per l'obiettivo (numero + unità, es. \"12 capitoli\", \"10 kg\", \"200 pagine\"), " +
    "la data di scadenza desiderata (formato YYYY-MM-DD), e quanto può dedicare realisticamente per periodo (numero + ogni quanti giorni: es. \"2 pagine al giorno\" -> capacityPerPeriod=2, periodDays=1; \"3 ore a settimana\" -> capacityPerPeriod=3, periodDays=7). " +
    "Fai una domanda alla volta. Quando hai tutte le informazioni in modo chiaro, imposta phaseComplete a true."
  );
}

function phase3Prompt({ wish, outcome, obstacle, realityCheckSummary }) {
  return (
    `Sei nella TERZA fase: definizione del process goal e del piano if-then (MCII). Contesto: obiettivo="${wish}", risultato immaginato="${outcome}", ostacolo personale="${obstacle}". ` +
    `Esito del reality check sulla scadenza: ${realityCheckSummary || "non disponibile"}. ` +
    "Proponi TU per primo, come bozza: (1) 'processGoal', un'azione concreta e RICORRENTE (non solo il risultato finale) coerente con un ritmo sostenibile; " +
    `(2) 'ifThenPlan', un piano nella forma "Se ${obstacle ? obstacle : "succede l'ostacolo"}, allora farò ..." basato sull'ostacolo indicato, con un'azione specifica e realizzabile. ` +
    "Presenta la tua proposta chiedendo conferma o modifiche. Quando l'utente conferma (anche con piccoli aggiustamenti), imposta phaseComplete a true con i valori finali confermati."
  );
}

export async function handleCoachMessage(user, text, { channel, channelRef }) {
  const reviewing = await getGoalByStatus(user.id, channel, channelRef, "reviewing");
  if (reviewing) return handleReviewAnswer(user, reviewing, text);

  const interviewing = await getGoalByStatus(user.id, channel, channelRef, "interviewing");
  if (interviewing) return continueInterview(user, interviewing, text);

  const due = await getDueReview(user.id, channel, channelRef);
  if (due) return startReview(user, due);

  if (!COACH_TRIGGER_PATTERN.test(text)) return null;
  return startInterview(user, text, { channel, channelRef });
}

async function startInterview(user, text, { channel, channelRef }) {
  const row = (
    await query(
      `INSERT INTO coach_goals (user_id, channel, channel_ref, status, phase, interview_history)
       VALUES ($1, $2, $3, 'interviewing', 1, '[]'::jsonb)
       RETURNING *`,
      [user.id, channel, channelRef],
    )
  ).rows[0];
  return continueInterview(user, row, text);
}

async function continueInterview(user, row, text) {
  try {
    if (row.phase === 1) return await stepPhase1(user, row, text);
    if (row.phase === 2) return await stepPhase2(user, row, text);
    return await stepPhase3(user, row, text);
  } catch (error) {
    console.error("[coach] errore durante l'intervista", user.id, row.id, error?.message || error);
    return "In questo momento non riesco a elaborare la tua risposta per l'obiettivo che stiamo definendo. Riprova tra poco.";
  }
}

async function saveTranscriptTurn(rowId, history, text, nextQuestion) {
  const transcript = [...history, { role: "user", content: text }, { role: "assistant", content: nextQuestion || "" }];
  await query(`UPDATE coach_goals SET interview_history = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(transcript), rowId]);
  return transcript;
}

async function stepPhase1(user, row, text) {
  const history = [...(row.interview_history || []), { role: "user", content: text }];
  const extracted = await callCoach(phase1Prompt(), history, SCHEMA1);
  const wish = extracted.wish || row.wish;
  const motivation = extracted.motivation || row.motivation;

  if (!extracted.phaseComplete || !wish || !motivation) {
    await saveTranscriptTurn(row.id, row.interview_history || [], text, extracted.nextQuestion);
    await query(`UPDATE coach_goals SET wish = $1, motivation = $2 WHERE id = $3`, [wish, motivation, row.id]);
    return extracted.nextQuestion || "Raccontami di più sul tuo obiettivo.";
  }

  await query(
    `UPDATE coach_goals SET phase = 2, wish = $1, motivation = $2, interview_history = '[]'::jsonb, updated_at = NOW() WHERE id = $3`,
    [wish, motivation, row.id],
  );
  const opening = await callCoach(phase2Prompt({ wish, motivation }), [], SCHEMA2);
  await saveTranscriptTurn(row.id, [], "(inizio fase 2)", opening.nextQuestion);
  return opening.nextQuestion || `Perfetto. Ora dimmi: come sarebbe la tua vita se raggiungessi "${wish}"?`;
}

async function stepPhase2(user, row, text) {
  const history = [...(row.interview_history || []), { role: "user", content: text }];
  const extracted = await callCoach(phase2Prompt({ wish: row.wish, motivation: row.motivation }), history, SCHEMA2);

  const merged = {
    outcome: extracted.outcome || row.outcome,
    obstacle: extracted.obstacle || row.obstacle,
    deadlineAt: extracted.deadlineAt || row.deadline_at,
    totalQuantity: extracted.totalQuantity ?? row.effort_estimate?.totalQuantity ?? null,
    unit: extracted.unit || row.effort_estimate?.unit || null,
    capacityPerPeriod: extracted.capacityPerPeriod ?? row.effort_estimate?.capacityPerPeriod ?? null,
    periodDays: extracted.periodDays ?? row.effort_estimate?.periodDays ?? null,
  };

  const hasRealityInputs = merged.totalQuantity && merged.capacityPerPeriod && merged.periodDays && merged.deadlineAt;
  const realityCheck = hasRealityInputs ? computeRealityCheck(merged) : null;
  const acceptedAnyway = ACCEPT_ANYWAY_PATTERN.test(text);
  const realityCheckAlreadyShown = Boolean(row.effort_estimate?.realityCheckShown);

  if (!extracted.phaseComplete || !merged.outcome || !merged.obstacle || !hasRealityInputs) {
    await query(
      `UPDATE coach_goals SET outcome = $1, obstacle = $2, deadline_at = $3, effort_estimate = $4::jsonb WHERE id = $5`,
      [merged.outcome, merged.obstacle, merged.deadlineAt || null, JSON.stringify({ ...merged, realityCheckShown: realityCheckAlreadyShown }), row.id],
    );
    await saveTranscriptTurn(row.id, row.interview_history || [], text, extracted.nextQuestion);
    return extracted.nextQuestion || "Dimmi qualcosa in più su quanto tempo/impegno pensi di dedicarci.";
  }

  if (realityCheck && !realityCheck.feasible && !realityCheckAlreadyShown && !acceptedAnyway) {
    const message = realityCheckMessage(realityCheck, { wish: row.wish, unit: merged.unit, deadlineAt: merged.deadlineAt });
    await query(
      `UPDATE coach_goals SET outcome = $1, obstacle = $2, deadline_at = $3, effort_estimate = $4::jsonb, reality_check = $5::jsonb WHERE id = $6`,
      [merged.outcome, merged.obstacle, merged.deadlineAt, JSON.stringify({ ...merged, realityCheckShown: true }), JSON.stringify(realityCheck), row.id],
    );
    await saveTranscriptTurn(row.id, row.interview_history || [], text, message);
    return message;
  }

  // Fase 2 completata (ritmo sostenibile, oppure l'utente ha accettato il rischio): passa alla fase 3.
  await query(
    `UPDATE coach_goals
     SET phase = 3, outcome = $1, obstacle = $2, deadline_at = $3, effort_estimate = $4::jsonb, reality_check = $5::jsonb,
         interview_history = '[]'::jsonb, updated_at = NOW()
     WHERE id = $6`,
    [merged.outcome, merged.obstacle, merged.deadlineAt, JSON.stringify(merged), realityCheck ? JSON.stringify(realityCheck) : null, row.id],
  );
  const realityCheckSummary = realityCheck
    ? realityCheck.feasible
      ? "ritmo sostenibile per la scadenza indicata"
      : `ritmo richiesto superiore a quanto sostenibile (${realityCheck.ratio.toFixed(1)}x), l'utente ha scelto di procedere comunque`
    : null;
  const opening = await callCoach(
    phase3Prompt({ wish: row.wish, outcome: merged.outcome, obstacle: merged.obstacle, realityCheckSummary }),
    [],
    SCHEMA3,
  );
  await saveTranscriptTurn(row.id, [], "(inizio fase 3)", opening.nextQuestion);
  return opening.nextQuestion || "Ora definiamo insieme un piano concreto: cosa faresti, passo dopo passo?";
}

async function stepPhase3(user, row, text) {
  const history = [...(row.interview_history || []), { role: "user", content: text }];
  const realityCheckSummary = row.reality_check
    ? row.reality_check.feasible
      ? "ritmo sostenibile per la scadenza indicata"
      : `ritmo richiesto superiore a quanto sostenibile (${Number(row.reality_check.ratio).toFixed(1)}x), l'utente ha scelto di procedere comunque`
    : null;
  const extracted = await callCoach(
    phase3Prompt({ wish: row.wish, outcome: row.outcome, obstacle: row.obstacle, realityCheckSummary }),
    history,
    SCHEMA3,
  );

  const processGoal = extracted.processGoal || row.process_goal;
  const ifThenPlan = extracted.ifThenPlan || row.if_then_plan;

  if (!extracted.phaseComplete || !processGoal || !ifThenPlan) {
    await query(`UPDATE coach_goals SET process_goal = $1, if_then_plan = $2 WHERE id = $3`, [processGoal, ifThenPlan, row.id]);
    await saveTranscriptTurn(row.id, row.interview_history || [], text, extracted.nextQuestion);
    return extracted.nextQuestion || "Vuoi aggiustare qualcosa nel piano?";
  }

  const finalRow = { ...row, process_goal: processGoal, if_then_plan: ifThenPlan };
  return finalizeGoal(user, finalRow);
}

async function finalizeGoal(user, row) {
  const nextReviewAt = new Date(Date.now() + REVIEW_INTERVAL_DAYS * 86_400_000);
  await query(
    `UPDATE coach_goals
     SET status = 'active', process_goal = $1, if_then_plan = $2, next_review_at = $3, updated_at = NOW()
     WHERE id = $4`,
    [row.process_goal, row.if_then_plan, nextReviewAt.toISOString(), row.id],
  );

  const diaryNote = await writeDiaryEntry(user, row, "creazione").catch((error) => {
    console.error("[coach] scrittura diario Drive fallita", user.id, error?.message || error);
    return null;
  });

  const summary =
    `Obiettivo salvato: "${row.wish}".\n` +
    `Process goal: ${row.process_goal}\n` +
    `Piano se-allora: ${row.if_then_plan}\n\n` +
    (diaryNote
      ? `Ho scritto una voce nel tuo diario obiettivi su Google Drive ("${DIARY_DOC_NAME}"). Ti ricontatterò tra circa ${REVIEW_INTERVAL_DAYS} giorni per fare il punto.`
      : `Non ho un Google Drive collegato quindi non ho potuto tenerne traccia nel diario — se colleghi Drive dalle integrazioni lo farò automaticamente la prossima volta. Ti ricontatterò tra circa ${REVIEW_INTERVAL_DAYS} giorni per fare il punto.`);
  return summary;
}

async function startReview(user, row) {
  await query(`UPDATE coach_goals SET status = 'reviewing', updated_at = NOW() WHERE id = $1`, [row.id]);
  return `A proposito del tuo obiettivo "${row.wish}": come va? Hai fatto progressi con "${row.process_goal}"? (Puoi anche dirmi se l'hai raggiunto o se vuoi lasciarlo perdere.)`;
}

async function handleReviewAnswer(user, row, text) {
  try {
    if (GOAL_ACHIEVED_PATTERN.test(text)) {
      await query(`UPDATE coach_goals SET status = 'completed', last_review_at = NOW(), updated_at = NOW() WHERE id = $1`, [row.id]);
      await writeDiaryEntry(user, { ...row, reviewNote: text, reviewOutcome: "completato" }, "completamento").catch((error) => {
        console.error("[coach] scrittura diario Drive fallita", user.id, error?.message || error);
      });
      return `Fantastico, complimenti per aver raggiunto "${row.wish}"! L'ho segnato come completato nel tuo diario obiettivi.`;
    }
    if (GOAL_ABANDON_PATTERN.test(text)) {
      await query(`UPDATE coach_goals SET status = 'abandoned', last_review_at = NOW(), updated_at = NOW() WHERE id = $1`, [row.id]);
      await writeDiaryEntry(user, { ...row, reviewNote: text, reviewOutcome: "abbandonato" }, "abbandono").catch((error) => {
        console.error("[coach] scrittura diario Drive fallita", user.id, error?.message || error);
      });
      return `Va bene, ho segnato che hai lasciato perdere "${row.wish}". Se in futuro vuoi riprenderlo o fissarne uno nuovo, dimmelo pure.`;
    }

    const nextReviewAt = new Date(Date.now() + REVIEW_INTERVAL_DAYS * 86_400_000);
    await query(
      `UPDATE coach_goals SET status = 'active', last_review_at = NOW(), next_review_at = $1, updated_at = NOW() WHERE id = $2`,
      [nextReviewAt.toISOString(), row.id],
    );
    await writeDiaryEntry(user, { ...row, reviewNote: text, reviewOutcome: "in corso" }, "review periodica").catch((error) => {
      console.error("[coach] scrittura diario Drive fallita", user.id, error?.message || error);
    });
    return `Grazie dell'aggiornamento, l'ho annotato nel tuo diario obiettivi. Ci sentiamo tra circa ${REVIEW_INTERVAL_DAYS} giorni per un altro check.`;
  } catch (error) {
    console.error("[coach] errore durante la review", user.id, row.id, error?.message || error);
    return "Non sono riuscito a registrare l'aggiornamento sul tuo obiettivo, riprova tra poco.";
  }
}

// LL-25/LL-26: voce di diario in tono umano che collega, quando pertinente, le voci passate correlate.
async function writeDiaryEntry(user, row, eventType) {
  const connected = await isDriveConnected(user.id);
  if (!connected) return null;

  const existing = (await searchDriveFiles(user.id, DIARY_DOC_NAME, 3)).find((file) => file.name === DIARY_DOC_NAME);
  let previousContent = "";
  let diaryFile = existing || null;
  if (diaryFile) {
    previousContent = await readDriveFileText(user.id, diaryFile).catch(() => "");
  }

  const context =
    `Tipo di evento: ${eventType}.\n` +
    `Obiettivo: ${row.wish}\n` +
    `Motivazione: ${row.motivation || "-"}\n` +
    `Risultato immaginato: ${row.outcome || "-"}\n` +
    `Ostacolo personale: ${row.obstacle || "-"}\n` +
    `Process goal: ${row.process_goal || "-"}\n` +
    `Piano se-allora: ${row.if_then_plan || "-"}\n` +
    (row.reviewNote ? `Nota della review: ${row.reviewNote}\nEsito: ${row.reviewOutcome}\n` : "") +
    (row.reality_check ? `Reality check: ${row.reality_check.feasible ? "ritmo sostenibile" : `ritmo richiesto ${Number(row.reality_check.ratio).toFixed(1)}x oltre il sostenibile`}\n` : "");

  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          "Scrivi UNA voce di diario personale in italiano, in prima persona come se fossi l'assistente che tiene un diario umano e riflessivo sugli obiettivi del suo utente (mai un elenco puntato, mai un tono da report aziendale). " +
          "Massimo 120 parole. Inizia con la data odierna in formato leggibile. Se nel DIARIO PRECEDENTE trovi voci passate chiaramente collegate per tema (stesso obiettivo, obiettivo simile, stesso ostacolo ricorrente), citale esplicitamente e in modo naturale (es. \"come nell'obiettivo di...\"); altrimenti non forzare collegamenti inventati.\n\n" +
          `DIARIO PRECEDENTE (puoi essere vuoto):\n${previousContent.slice(-6000)}`,
      },
      { role: "user", content: context },
    ],
    max_tokens: 400,
  });
  const entryText = completion.choices?.[0]?.message?.content?.trim();
  if (!entryText) return null;

  if (diaryFile) {
    await appendToDriveFile(user.id, { fileId: diaryFile.id, name: diaryFile.name, addition: entryText });
  } else {
    diaryFile = await createDriveFile(user.id, {
      name: DIARY_DOC_NAME,
      content: `Questo è il diario dei tuoi obiettivi, scritto dal tuo assistente personale.\n\n${entryText}`,
    });
  }
  return entryText;
}
