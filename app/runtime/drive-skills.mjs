import { appendToDriveFile, createDriveFile, readDriveFileText, searchDriveFiles } from "./google-drive.mjs";
import { registerSkill } from "./skills.mjs";

function safeFileName(name, fallback) {
  return String(name || fallback).trim().slice(0, 150) || fallback;
}

function previewText(content) {
  const clean = String(content || "");
  return clean.length > 300 ? `${clean.slice(0, 300)}…` : clean;
}

// --- drive_cerca_file (sola lettura) -------------------------------------------------------------

async function handleDriveCercaFile(args, context) {
  const matches = await searchDriveFiles(context.userId, args.query, 5).catch((error) => {
    console.error("[drive-skills] ricerca fallita", context.userId, error?.message || error);
    return null;
  });
  if (matches === null) return { message: "Non riesco a cercare su Google Drive in questo momento." };
  if (!matches.length) return { message: `Non ho trovato file su Drive che corrispondono a "${args.query}".` };
  const list = matches.map((file, index) => `${index + 1}. ${file.name}`).join("\n");
  return { message: `File trovati su Drive:\n${list}` };
}

registerSkill("drive_cerca_file", {
  description: "Cerca file su Google Drive per nome o contenuto e restituisce l'elenco dei risultati più pertinenti.",
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "Nome o parola chiave da cercare tra i file Drive" } },
    required: ["query"],
  },
  needsApproval: false,
  requiresIntegration: "google_drive",
  handler: handleDriveCercaFile,
});

// --- drive_leggi_file (sola lettura) -------------------------------------------------------------

async function handleDriveLeggiFile(args, context) {
  const matches = await searchDriveFiles(context.userId, args.fileName, 3).catch((error) => {
    console.error("[drive-skills] ricerca fallita", context.userId, error?.message || error);
    return null;
  });
  if (matches === null) return { message: "Non riesco a cercare su Google Drive in questo momento." };
  const file = matches[0];
  if (!file) return { message: `Non ho trovato un file che corrisponde a "${args.fileName}" su Drive.` };
  try {
    const content = await readDriveFileText(context.userId, file);
    return { message: `Contenuto di "${file.name}":\n\n${content.slice(0, 3000)}${content.length > 3000 ? "\n…" : ""}` };
  } catch (error) {
    console.error("[drive-skills] lettura fallita", context.userId, file.id, error?.message || error);
    return { message: `Ho trovato "${file.name}" su Drive ma non riesco a leggerne il contenuto.` };
  }
}

registerSkill("drive_leggi_file", {
  description: "Cerca e legge il contenuto testuale di un file già presente su Google Drive, per rispondere a domande su di esso.",
  parameters: {
    type: "object",
    properties: { fileName: { type: "string", description: "Nome (anche parziale) del file da cercare su Drive" } },
    required: ["fileName"],
  },
  needsApproval: false,
  requiresIntegration: "google_drive",
  handler: handleDriveLeggiFile,
});

// --- drive_crea_file (richiede conferma) ----------------------------------------------------------

async function previewDriveCreaFile(args) {
  const fileName = safeFileName(args.fileName, "Nota");
  return `Sto per creare un nuovo file "${fileName}.txt" su Drive con questo contenuto:\n\n"${previewText(args.content)}"\n\nConfermi? (sì/no)`;
}

async function handleDriveCreaFile(args, context) {
  const fileName = safeFileName(args.fileName, "Nota");
  try {
    const created = await createDriveFile(context.userId, { name: fileName, content: args.content });
    return { message: `Fatto! Ho creato il file "${created.name}" su Drive.` };
  } catch (error) {
    console.error("[drive-skills] creazione fallita", context.userId, error?.message || error);
    return { message: "Non sono riuscito a creare il file su Drive." };
  }
}

registerSkill("drive_crea_file", {
  description: "Crea un nuovo file di testo su Google Drive con il contenuto indicato dall'utente.",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "Nome del file, senza estensione" },
      content: { type: "string", description: "Testo completo da salvare nel file" },
    },
    required: ["fileName", "content"],
  },
  needsApproval: true,
  preview: previewDriveCreaFile,
  handler: handleDriveCreaFile,
  requiresIntegration: "google_drive",
});

// --- drive_aggiungi_testo (richiede conferma) -------------------------------------------------------

async function resolveExistingFile(userId, fileName) {
  const matches = await searchDriveFiles(userId, fileName, 1).catch(() => []);
  return matches[0] || null;
}

async function previewDriveAggiungiTesto(args, context) {
  const file = await resolveExistingFile(context.userId, args.fileName);
  const preview = previewText(args.content);
  if (!file) {
    return `Non ho trovato un file "${args.fileName}" su Drive: se confermi, lo creo da zero con questo contenuto:\n\n"${preview}"\n\nConfermi? (sì/no)`;
  }
  return `Sto per aggiungere questo testo al file esistente "${file.name}" su Drive:\n\n"${preview}"\n\nConfermi? (sì/no)`;
}

async function handleDriveAggiungiTesto(args, context) {
  const file = await resolveExistingFile(context.userId, args.fileName);
  try {
    if (!file) {
      const created = await createDriveFile(context.userId, { name: args.fileName, content: args.content });
      return { message: `Non ho trovato "${args.fileName}", quindi ho creato un nuovo file "${created.name}" su Drive con questo contenuto.` };
    }
    await appendToDriveFile(context.userId, { fileId: file.id, name: file.name, addition: args.content });
    return { message: `Fatto! Ho aggiunto il testo al file "${file.name}" su Drive.` };
  } catch (error) {
    console.error("[drive-skills] aggiunta testo fallita", context.userId, error?.message || error);
    return { message: "Non sono riuscito a completare l'operazione su Drive." };
  }
}

registerSkill("drive_aggiungi_testo", {
  description: "Aggiunge testo in fondo a un file esistente su Google Drive (lo crea se non lo trova).",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "Nome (anche parziale) del file a cui aggiungere il testo" },
      content: { type: "string", description: "Testo da aggiungere" },
    },
    required: ["fileName", "content"],
  },
  needsApproval: true,
  preview: previewDriveAggiungiTesto,
  handler: handleDriveAggiungiTesto,
  requiresIntegration: "google_drive",
});
