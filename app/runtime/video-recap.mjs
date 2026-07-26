import { query } from "./db.mjs";
import { openRouter } from "./assistant.mjs";
import { createDriveFile, ensureDriveFolder } from "./google-drive.mjs";
import { fetchVideoTranscript, transcribeAudio } from "./speech.mjs";

const RECAP_FOLDER_NAME = "Assistente - Recap Video";
const VIDEO_URL_PATTERN = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|facebook\.com|fb\.watch)\/\S+)/i;
const MAX_VIDEO_FILE_BYTES = 60 * 1024 * 1024;

const CONFIRM_WORDS = ["si", "sì", "ok", "va bene", "confermo", "procedi"];
const CANCEL_WORDS = ["annulla", "cancella", "niente", "lascia stare", "no grazie", "no"];

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

function guessExt(mimetype) {
  if (!mimetype) return "mp4";
  if (mimetype.includes("quicktime")) return "mov";
  if (mimetype.includes("webm")) return "webm";
  return "mp4";
}

function introMessage() {
  return (
    'Ricevuto! Dimmi: che tipo di recap ti serve — bullet veloci, medio o completo — e a cosa ti serve: farti un\'idea al volo, ' +
    "decidere se guardarlo, o studiarlo? Dimmi anche se lo vuoi qui in chat o come documento su Drive, e se vuoi anche un mini-audio."
  );
}

async function getSession(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM video_recap_sessions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

async function deleteSession(id) {
  await query(`DELETE FROM video_recap_sessions WHERE id = $1`, [id]);
}

async function saveNewSession(userId, channel, channelRef, { sourceUrl, sourceBuffer, sourceMimetype }) {
  await query(`DELETE FROM video_recap_sessions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3`, [userId, channel, channelRef]);
  await query(
    `INSERT INTO video_recap_sessions (user_id, channel, channel_ref, status, source_url, source_buffer, source_mimetype, expires_at)
     VALUES ($1, $2, $3, 'awaiting_preferences', $4, $5, $6, NOW() + INTERVAL '20 minutes')`,
    [userId, channel, channelRef, sourceUrl || null, sourceBuffer || null, sourceMimetype || null],
  );
}

export async function handleVideoRecapMessage(user, text, { channel, channelRef }) {
  const session = await getSession(user.id, channel, channelRef);
  if (session) {
    return continueSession(user, session, text).catch((error) => {
      console.error("[video-recap] errore sessione", user.id, error?.message || error);
      return "Non sono riuscito a elaborare la richiesta sul recap video. Riprova tra poco.";
    });
  }
  const match = text.match(VIDEO_URL_PATTERN);
  if (!match) return null;
  await saveNewSession(user.id, channel, channelRef, { sourceUrl: match[1] });
  return introMessage();
}

export async function handleVideoRecapFile(user, buffer, mimetype, { channel, channelRef }) {
  if (buffer.length > MAX_VIDEO_FILE_BYTES) {
    return "Questo video è troppo grande per essere elaborato qui: prova a mandarmi il link (YouTube/Vimeo/TikTok/Facebook) invece del file.";
  }
  await saveNewSession(user.id, channel, channelRef, { sourceBuffer: buffer, sourceMimetype: mimetype });
  return introMessage();
}

const SCHEMA_PREFS = `{"length": "veloce"|"medio"|"completo", "goal": "panoramica"|"decidere"|"studiare", "output": "chat"|"drive", "wantsAudio": boolean}`;

async function extractPreferences(text) {
  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content:
          "Estrai le preferenze per un recap video dalla risposta dell'utente: lunghezza (veloce=solo bullet essenziali, medio, completo=dettagliato), " +
          "obiettivo (panoramica=farsi un'idea al volo, decidere=capire se vale la pena guardarlo, studiare=capirlo a fondo), dove vuole il risultato " +
          "(chat=qui in WhatsApp, drive=documento salvato su Google Drive) e se vuole anche un mini riassunto audio. " +
          `Se qualcosa non è specificato usa questi default: length="medio", goal="panoramica", output="chat", wantsAudio=false. ` +
          `Rispondi SOLO con JSON valido in questa forma: ${SCHEMA_PREFS}`,
      },
      { role: "user", content: text },
    ],
    max_tokens: 200,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices?.[0]?.message?.content || "{}");
}

async function buildRecap(transcriptText, prefs) {
  const lengthInstructions =
    {
      veloce: "Massimo 5 bullet point brevissimi, solo l'essenziale.",
      medio: "Un recap in 8-10 bullet point con i punti chiave.",
      completo: "Un recap dettagliato e strutturato in sezioni, che copre tutti i punti importanti del contenuto.",
    }[prefs.length] || "Un recap in 8-10 bullet point con i punti chiave.";
  const goalInstructions =
    {
      panoramica: "L'utente vuole solo farsi un'idea generale al volo.",
      decidere: "L'utente deve decidere se vale la pena guardare il video per intero: evidenzia se è utile/interessante e perché.",
      studiare: "L'utente vuole studiare il contenuto a fondo: sii preciso, includi concetti, dati e argomentazioni chiave.",
    }[prefs.goal] || "L'utente vuole farsi un'idea generale.";

  const completion = await openRouter().chat.completions.create({
    model: model(),
    messages: [
      {
        role: "system",
        content: `Scrivi un recap in italiano di questo contenuto video, basandoti solo sulla trascrizione fornita. ${lengthInstructions} ${goalInstructions} Non inventare informazioni non presenti nella trascrizione.`,
      },
      { role: "user", content: transcriptText.slice(0, 15000) },
    ],
    max_tokens: 1200,
  });
  return completion.choices?.[0]?.message?.content?.trim();
}

async function continueSession(user, session, text) {
  if (session.status === "awaiting_drive_confirmation") {
    if (isCancellation(text)) {
      await deleteSession(session.id);
      return "Va bene, non ho salvato nulla su Drive.";
    }
    if (!isConfirmation(text)) {
      return 'Vuoi che salvi il recap su Drive? Rispondi "sì" per confermare o "annulla" per lasciar perdere.';
    }
    const recap = session.pending_recap;
    try {
      const folderId = await ensureDriveFolder(user.id, RECAP_FOLDER_NAME);
      await createDriveFile(user.id, { name: recap.title, content: recap.text, parentId: folderId });
      await deleteSession(session.id);
      return `Fatto, ho salvato il recap su Drive in "${RECAP_FOLDER_NAME}".`;
    } catch (error) {
      await deleteSession(session.id);
      console.error("[video-recap] salvataggio Drive fallito", user.id, error?.message || error);
      return "Non sono riuscito a salvare il recap su Drive.";
    }
  }

  const prefs = await extractPreferences(text).catch((error) => {
    console.error("[video-recap] estrazione preferenze fallita", user.id, error?.message || error);
    return null;
  });
  if (!prefs) return "Non ho capito bene le tue preferenze: puoi ripetermi lunghezza e obiettivo del recap?";

  let transcriptResult;
  try {
    if (session.source_url) {
      transcriptResult = await fetchVideoTranscript(session.source_url);
    } else {
      const transcribed = await transcribeAudio(session.source_buffer, { ext: guessExt(session.source_mimetype) });
      transcriptResult = { text: transcribed, source: "whisper", title: null };
    }
  } catch (error) {
    await deleteSession(session.id);
    console.error("[video-recap] trascrizione fallita", user.id, error?.message || error);
    return "Non sono riuscito a leggere o trascrivere questo video.";
  }

  if (!transcriptResult.text || transcriptResult.text.trim().length < 10) {
    await deleteSession(session.id);
    return "Non ho trovato abbastanza contenuto parlato in questo video per fare un recap.";
  }

  const recapText = await buildRecap(transcriptResult.text, prefs).catch((error) => {
    console.error("[video-recap] generazione recap fallita", user.id, error?.message || error);
    return null;
  });
  if (!recapText) {
    await deleteSession(session.id);
    return "Ho trascritto il video ma non sono riuscito a generare il recap.";
  }

  const title = transcriptResult.title || "il tuo video";
  const header = `Recap di "${title}" (fonte: ${transcriptResult.source === "captions" ? "sottotitoli" : "trascrizione automatica"}):\n\n`;
  const fullText = `${header}${recapText}`;

  if (prefs.output === "drive") {
    await query(`UPDATE video_recap_sessions SET status = 'awaiting_drive_confirmation', pending_recap = $1::jsonb WHERE id = $2`, [
      JSON.stringify({ text: recapText, title }),
      session.id,
    ]);
    return `${fullText}\n\nVuoi che lo salvi anche su Drive? (sì/no)`;
  }

  await deleteSession(session.id);
  if (prefs.wantsAudio) {
    return { text: fullText, audioText: recapText.slice(0, 600) };
  }
  return fullText;
}
