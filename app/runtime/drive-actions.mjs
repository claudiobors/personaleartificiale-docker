import { query } from "./db.mjs";
import { openRouter } from "./assistant.mjs";
import { appendToDriveFile, createDriveFile, isDriveConnected, readDriveFileText, searchDriveFiles } from "./google-drive.mjs";

const DRIVE_MENTION = /\bdrive\b/i;
const FILE_NOUN = /\b(file|documento|nota|foglio)\b/i;
const WRITE_VERBS = /\b(crea|creami|salva|salvami|scrivi|scrivimi|aggiungi|annota|annotami)\b/i;
const READ_VERBS = /\b(cerca|trova|apri|leggi|dammi|mostrami|hai)\b/i;

const CONFIRM_WORDS = ["si", "sì", "ok", "va bene", "confermo", "procedi"];
const CANCEL_WORDS = ["annulla", "cancella", "niente", "lascia stare", "no grazie", "no"];

function detectIntent(text) {
  const mentionsDrive = DRIVE_MENTION.test(text);
  const mentionsFile = FILE_NOUN.test(text);
  if (!mentionsDrive && !mentionsFile) return null;
  if (WRITE_VERBS.test(text)) return "write";
  if (mentionsDrive || READ_VERBS.test(text)) return "read";
  return null;
}

function isConfirmation(text) {
  const normalized = text.trim().toLowerCase();
  return CONFIRM_WORDS.some((word) => normalized === word || normalized.includes(word));
}

function isCancellation(text) {
  const normalized = text.trim().toLowerCase();
  return CANCEL_WORDS.some((word) => normalized === word || normalized.includes(word));
}

async function getPendingDriveAction(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM pending_drive_actions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

async function savePendingDriveAction(userId, channel, channelRef, proposal) {
  await query(`DELETE FROM pending_drive_actions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3`, [userId, channel, channelRef]);
  await query(
    `INSERT INTO pending_drive_actions (user_id, channel, channel_ref, proposal, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW() + INTERVAL '15 minutes')`,
    [userId, channel, channelRef, JSON.stringify(proposal)],
  );
}

async function deletePendingDriveAction(id) {
  await query(`DELETE FROM pending_drive_actions WHERE id = $1`, [id]);
}

async function extractDriveWriteIntent(text) {
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const completion = await openRouter().chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          `Estrai dall'istruzione dell'utente i dati per creare o aggiornare un file di testo su Google Drive. ` +
          `Rispondi SOLO con un oggetto JSON valido, senza altro testo, con questa forma esatta: ` +
          `{"fileName": "nome breve e descrittivo del file, senza estensione", "content": "il testo completo da salvare nel file", ` +
          `"searchExisting": "se l'utente si riferisce a un file già esistente da aggiornare, il nome o parola chiave per cercarlo, altrimenti null"}`,
      },
      { role: "user", content: text },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  });
  const raw = completion.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  return {
    fileName: String(parsed.fileName || "Nota").trim().slice(0, 200) || "Nota",
    content: String(parsed.content || "").trim().slice(0, 10_000),
    searchExisting: parsed.searchExisting ? String(parsed.searchExisting).trim().slice(0, 200) : null,
  };
}

async function handleDriveRead(user, text) {
  const searchTerm = text.replace(DRIVE_MENTION, "").replace(READ_VERBS, "").trim().slice(0, 200) || text;
  let files;
  try {
    files = await searchDriveFiles(user.id, searchTerm, 3);
  } catch (error) {
    console.error("[drive-actions] ricerca fallita", user.id, error?.message || error);
    return "Non riesco a cercare su Google Drive in questo momento.";
  }
  if (!files.length) return `Non ho trovato file su Drive che corrispondono a "${searchTerm}".`;

  const top = files[0];
  let content = "";
  try {
    content = await readDriveFileText(user.id, top);
  } catch (error) {
    console.error("[drive-actions] lettura fallita", user.id, top.id, error?.message || error);
    return `Ho trovato "${top.name}" su Drive ma non riesco a leggerne il contenuto.`;
  }

  try {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const completion = await openRouter().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            `Rispondi alla domanda dell'utente usando SOLO il contenuto del documento Google Drive "${top.name}" fornito qui sotto. ` +
            `Se il documento non contiene la risposta, dillo chiaramente.\n\nCONTENUTO:\n${content.slice(0, 6000)}`,
        },
        { role: "user", content: text },
      ],
      max_tokens: 600,
    });
    const answer = completion.choices?.[0]?.message?.content?.trim();
    return answer ? `${answer}\n\n(Fonte: ${top.name} su Google Drive)` : `Ho trovato "${top.name}" ma non sono riuscito a generare una risposta.`;
  } catch (error) {
    console.warn("[drive-actions] generazione risposta fallita, mostro estratto grezzo", error?.message || error);
    return `Ho trovato "${top.name}" su Drive. Estratto:\n\n${content.slice(0, 800)}`;
  }
}

async function handleDriveWriteRequest(user, text, { channel, channelRef }) {
  const extracted = await extractDriveWriteIntent(text).catch((error) => {
    console.warn("[drive-actions] estrazione scrittura fallita, uso testo grezzo", error?.message || error);
    return null;
  });
  const fileName = extracted?.fileName || `Nota ${new Date().toISOString().slice(0, 10)}`;
  const content = extracted?.content || text;

  let existingFile = null;
  if (extracted?.searchExisting) {
    const matches = await searchDriveFiles(user.id, extracted.searchExisting, 1).catch(() => []);
    existingFile = matches[0] || null;
  }

  const proposal = existingFile
    ? { mode: "append", fileId: existingFile.id, fileName: existingFile.name, content }
    : { mode: "create", fileName, content };

  await savePendingDriveAction(user.id, channel, channelRef, proposal);

  const preview = content.length > 300 ? `${content.slice(0, 300)}…` : content;
  return existingFile
    ? `Sto per aggiungere questo testo al file esistente "${existingFile.name}" su Drive:\n\n"${preview}"\n\nConfermi? (sì/no)`
    : `Sto per creare un nuovo file "${proposal.fileName}.txt" su Drive con questo contenuto:\n\n"${preview}"\n\nConfermi? (sì/no)`;
}

async function resolvePendingDriveAction(user, pending, text) {
  if (isCancellation(text)) {
    await deletePendingDriveAction(pending.id);
    return "Va bene, non ho creato né modificato nulla su Drive.";
  }
  if (!isConfirmation(text)) {
    return 'Non ho capito: rispondi "sì" per confermare o "annulla" per lasciar perdere.';
  }

  const proposal = pending.proposal;
  try {
    if (proposal.mode === "append") {
      await appendToDriveFile(user.id, { fileId: proposal.fileId, name: proposal.fileName, addition: proposal.content });
      await deletePendingDriveAction(pending.id);
      return `Fatto! Ho aggiunto il testo al file "${proposal.fileName}" su Drive.`;
    }
    const created = await createDriveFile(user.id, { name: proposal.fileName, content: proposal.content });
    await deletePendingDriveAction(pending.id);
    return `Fatto! Ho creato il file "${created.name}" su Drive.`;
  } catch (error) {
    await deletePendingDriveAction(pending.id);
    console.error("[drive-actions] azione fallita", user.id, error?.message || error);
    return "Mi dispiace, non sono riuscito a completare l'operazione su Drive.";
  }
}

export async function handleDriveMessage(user, text, { channel, channelRef }) {
  const connected = await isDriveConnected(user.id).catch(() => false);
  if (!connected) return null;

  const pending = await getPendingDriveAction(user.id, channel, channelRef);
  if (pending) return resolvePendingDriveAction(user, pending, text);

  const intent = detectIntent(text);
  if (!intent) return null;

  if (intent === "read") return handleDriveRead(user, text);
  return handleDriveWriteRequest(user, text, { channel, channelRef });
}
