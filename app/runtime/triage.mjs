import { query } from "./db.mjs";
import { openRouter } from "./assistant.mjs";
import { discardEmailDraft, listEmailDrafts, sendEmailDraft } from "./email-integration.mjs";
import { searchPersonEmail, sendGmailReply } from "./gmail.mjs";
import { appendToDriveFile, createDriveFile, isDriveConnected, searchDriveFiles } from "./google-drive.mjs";

const DIARY_DOC_NAME = "Assistente - Storia dei Triage";
const BACKLOG_THRESHOLD = Number(process.env.TRIAGE_BACKLOG_THRESHOLD || 15);
const PROPOSE_COOLDOWN_HOURS = Number(process.env.TRIAGE_PROPOSE_COOLDOWN_HOURS || 24);

const TRIAGE_TRIGGER_PATTERN = /\b(fai (un )?triage|triage della posta|aiutami con le email|email arretrate|email in sospeso|metti in ordine la posta|quante email ho)\b/i;
const CLOSE_PATTERN = /\b(basta cos[iì]|fermati|chiudi|per ora [eè] tutto|va bene cos[iì]|chiudiamo qui)\b/i;

function model() {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

async function getOpenSession(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM triage_sessions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND status = 'proposed' ORDER BY created_at DESC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

async function recentlyProposed(userId) {
  const result = await query(
    `SELECT 1 FROM triage_sessions WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${PROPOSE_COOLDOWN_HOURS} hours' LIMIT 1`,
    [userId],
  );
  return result.rowCount > 0;
}

export async function handleTriageMessage(user, text, { channel, channelRef }) {
  const open = await getOpenSession(user.id, channel, channelRef);
  if (open) return continueTriage(user, open, text).catch((error) => {
    console.error("[triage] errore durante la sessione", user.id, error?.message || error);
    return "Non sono riuscito a elaborare la richiesta sul triage della posta. Riprova tra poco.";
  });

  if (TRIAGE_TRIGGER_PATTERN.test(text)) {
    return startTriage(user, { channel, channelRef }).catch((error) => {
      console.error("[triage] avvio esplicito fallito", user.id, error?.message || error);
      return "Non sono riuscito ad avviare il triage della posta in questo momento.";
    });
  }

  const drafts = await listEmailDrafts(user.id).catch(() => []);
  if (drafts.length > BACKLOG_THRESHOLD && !(await recentlyProposed(user.id))) {
    return startTriage(user, { channel, channelRef }, drafts).catch((error) => {
      console.error("[triage] proposta automatica fallita", user.id, error?.message || error);
      return null;
    });
  }
  return null;
}

async function classifyDrafts(drafts) {
  const listing = drafts
    .slice(0, 50)
    .map((d) => `ID:${d.id} | Da: ${d.to} | Oggetto: ${d.subject} | Estratto: ${(d.originalSnippet || "").slice(0, 200)}`)
    .join("\n");
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          "Sei un assistente che aiuta a fare triage di email in sospeso, con un tono da collega premuroso, mai un report tecnico. " +
          "Raggruppa le email fornite in gruppi tematici (es. fatture/pagamenti, richieste clienti, newsletter, varie...). " +
          "Per ogni gruppo indica: una label breve, una sintesi di una frase, un'azione suggerita (una tra: 'rispondi tu stesso', 'invia le bozze già pronte', 'valuta di delegare', 'ignora o scarta'), e l'elenco degli ID email incluse. " +
          'Rispondi SOLO con JSON valido in questa forma: {"groups": [{"label": string, "summary": string, "suggestedAction": string, "draftIds": [string]}]}',
      },
      { role: "user", content: listing },
    ],
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices?.[0]?.message?.content || "{}");
}

async function startTriage(user, { channel, channelRef }, providedDrafts) {
  const drafts = providedDrafts || (await listEmailDrafts(user.id));
  if (!drafts.length) return null;

  const classification = await classifyDrafts(drafts);
  const groups = (classification.groups || [])
    .map((g) => ({
      label: String(g.label || "Varie").slice(0, 80),
      summary: String(g.summary || "").slice(0, 300),
      suggestedAction: String(g.suggestedAction || "valuta tu il da farsi").slice(0, 200),
      draftIds: (g.draftIds || []).filter((id) => drafts.some((d) => d.id === id)),
    }))
    .filter((g) => g.draftIds.length);
  if (!groups.length) return null;

  await query(`INSERT INTO triage_sessions (user_id, channel, channel_ref, status, groups) VALUES ($1,$2,$3,'proposed',$4::jsonb)`, [
    user.id,
    channel,
    channelRef,
    JSON.stringify(groups),
  ]);

  const intro =
    drafts.length > BACKLOG_THRESHOLD
      ? `Ho notato che hai ${drafts.length} email in sospeso, ti va se le mettiamo in ordine insieme? `
      : `Ho guardato le tue email in sospeso (${drafts.length}). `;
  const lines = groups.map((g, i) => `${i + 1}. ${g.label} (${g.draftIds.length}) — ${g.summary}. Suggerimento: ${g.suggestedAction}`);
  return (
    `${intro}Le ho raggruppate così:\n\n${lines.join("\n")}\n\n` +
    `Dimmi cosa fare per ogni gruppo (es. "manda tutte quelle di [gruppo]", "scarta [gruppo]", "delega [gruppo] a [nome]"), oppure "basta così" per chiudere.`
  );
}

async function extractTriageActions(groups, text) {
  const groupList = groups.map((g) => g.label).join(", ");
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          `Gruppi disponibili in questa sessione di triage: ${groupList}. ` +
          "Estrai dalla richiesta dell'utente quali azioni vuole fare su quali gruppi. " +
          "Tipi di azione possibili: send_all (invia tutte le bozze del gruppo così come sono), discard_all (scarta/ignora tutte), delegate (inoltra a una persona, indica il nome in delegateName). " +
          'Rispondi SOLO con JSON valido: {"actions": [{"groupLabel": string, "type": "send_all"|"discard_all"|"delegate", "delegateName": string|null}]}',
      },
      { role: "user", content: text },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices?.[0]?.message?.content || "{}");
}

// LL-23: mai inventare un'email di delega; usa solo un indirizzo verificato nella cronologia Gmail reale.
async function delegateGroup(user, group, delegateName) {
  if (!delegateName) return `Per delegare "${group.label}" dimmi a chi (un nome che conosco dalle tue email).`;
  const found = await searchPersonEmail(user.id, delegateName).catch(() => null);
  if (!found?.email) {
    return `Non ho trovato un indirizzo verificato per "${delegateName}" nelle tue email recenti: puoi darmi tu l'indirizzo giusto?`;
  }

  const drafts = await listEmailDrafts(user.id);
  const relevant = drafts.filter((d) => group.draftIds.includes(d.id));
  if (!relevant.length) return `Le email del gruppo "${group.label}" non sono più in sospeso.`;
  if (relevant.some((d) => d.provider !== "gmail")) {
    return `Posso delegare via email solo per l'account Gmail collegato per ora; per "${group.label}" gestiscile manualmente o dimmi di inviarle/scartarle.`;
  }

  const summary = relevant.map((d) => `- Da ${d.to}, oggetto "${d.subject}": ${(d.originalSnippet || "").slice(0, 200)}`).join("\n");
  const body = `Ciao,\npotresti occuparti di queste richieste?\n\n${summary}\n\nGrazie!`;
  try {
    await sendGmailReply(user.id, { to: found.email, subject: `Da gestire: ${group.label}`, body });
    for (const draft of relevant) await discardEmailDraft(user.id, draft.id).catch(() => {});
    return `Ho inoltrato "${group.label}" (${relevant.length} email) a ${found.email}${found.confident ? "" : " (indirizzo trovato ma non del tutto certo, verifica prima di fidarti)"}.`;
  } catch (error) {
    console.error("[triage] delega fallita", user.id, error?.message || error);
    return `Non sono riuscito a inoltrare "${group.label}" a ${found.email}.`;
  }
}

async function continueTriage(user, session, text) {
  if (CLOSE_PATTERN.test(text)) {
    await finalizeTriageSession(user, session, "chiuso dall'utente");
    return "Va bene, ci fermiamo qui. Ho annotato il triage nel tuo storico.";
  }

  const extraction = await extractTriageActions(session.groups, text);
  if (!extraction?.actions?.length) {
    return 'Non ho capito bene cosa vuoi fare con quei gruppi. Puoi dirmi ad esempio "manda tutte quelle di [gruppo]" o "scarta [gruppo]"?';
  }

  const results = [];
  for (const action of extraction.actions) {
    const group = session.groups.find((g) => g.label === action.groupLabel);
    if (!group) continue;
    if (action.type === "send_all") {
      let sent = 0;
      for (const id of group.draftIds) {
        await sendEmailDraft(user.id, id)
          .then(() => sent++)
          .catch((error) => console.error("[triage] invio bozza fallito", id, error?.message || error));
      }
      results.push(`Inviate ${sent}/${group.draftIds.length} email del gruppo "${group.label}".`);
    } else if (action.type === "discard_all") {
      let discarded = 0;
      for (const id of group.draftIds) {
        await discardEmailDraft(user.id, id)
          .then(() => discarded++)
          .catch(() => {});
      }
      results.push(`Scartate ${discarded}/${group.draftIds.length} email del gruppo "${group.label}".`);
    } else if (action.type === "delegate") {
      results.push(await delegateGroup(user, group, action.delegateName));
    }
  }

  if (!results.length) {
    return 'Non ho capito bene cosa vuoi fare con quei gruppi. Puoi dirmi ad esempio "manda tutte quelle di [gruppo]" o "scarta [gruppo]"?';
  }

  const handledLabels = new Set(extraction.actions.map((a) => a.groupLabel));
  const remainingGroups = session.groups.filter((g) => !handledLabels.has(g.label));
  await query(`UPDATE triage_sessions SET groups = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(remainingGroups), session.id]);

  if (!remainingGroups.length) {
    await finalizeTriageSession(user, { ...session, groups: session.groups }, "tutti i gruppi gestiti");
    return `${results.join("\n")}\n\nFatto, hai gestito tutti i gruppi. Ho annotato il triage nel tuo storico.`;
  }
  return `${results.join("\n")}\n\nRestano da gestire: ${remainingGroups.map((g) => g.label).join(", ")}. Dimmi come procedere, oppure "basta così" per chiudere.`;
}

async function finalizeTriageSession(user, session, reason) {
  await query(`UPDATE triage_sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [session.id]);
  await writeTriageDiaryEntry(user, session, reason).catch((error) => {
    console.error("[triage] scrittura diario Drive fallita", user.id, error?.message || error);
  });
}

// LL-25: voce di diario in tono narrativo umano, coerente con il diario obiettivi del modulo Coach.
async function writeTriageDiaryEntry(user, session, reason) {
  const connected = await isDriveConnected(user.id);
  if (!connected) return null;

  const existing = (await searchDriveFiles(user.id, DIARY_DOC_NAME, 3)).find((file) => file.name === DIARY_DOC_NAME);
  const context = `Motivo chiusura: ${reason}. Gruppi di questo giro: ${session.groups.map((g) => `${g.label} (${g.draftIds.length} email)`).join("; ") || "nessuno rimasto"}.`;

  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          "Scrivi UNA voce di diario in italiano, in prima persona, in formato narrativo umano (mai elenco puntato, mai tono da report aziendale), che racconta come è andato questo giro di triage della posta. Massimo 100 parole, inizia con la data odierna in formato leggibile.",
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
    await createDriveFile(user.id, {
      name: DIARY_DOC_NAME,
      content: `Questa è la storia dei triage della posta fatti dal tuo assistente.\n\n${entryText}`,
    });
  }
  return entryText;
}
