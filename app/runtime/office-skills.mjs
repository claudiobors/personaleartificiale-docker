import { instanceNameForUser, sendWhatsAppDocument } from "./evolution.mjs";
import { createDocx, createExcel, createPdf, createPptx, extractPdfText, readExcel } from "./office.mjs";
import { createDriveFile, downloadDriveFileBuffer, ensureDriveFolder, isDriveConnected, searchDriveFiles } from "./google-drive.mjs";
import { registerSkill } from "./skills.mjs";

const GENERATED_FOLDER_NAME = "Assistente - File Generati";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

async function deliverGeneratedFile(userId, channelRef, { buffer, fileName, mimetype, caption }) {
  const notes = [];
  const driveConnected = await isDriveConnected(userId).catch(() => false);
  if (driveConnected) {
    try {
      const folderId = await ensureDriveFolder(userId, GENERATED_FOLDER_NAME);
      await createDriveFile(userId, { name: fileName, content: buffer, mimeType: mimetype, parentId: folderId });
      notes.push(`salvato su Drive in "${GENERATED_FOLDER_NAME}"`);
    } catch (error) {
      console.error("[office-skills] salvataggio Drive fallito", userId, error?.message || error);
      notes.push("non sono riuscito a salvarlo su Drive");
    }
  }
  if (channelRef) {
    const instanceName = await instanceNameForUser(userId).catch(() => null);
    if (instanceName) {
      try {
        await sendWhatsAppDocument(instanceName, channelRef, { buffer, fileName, mimetype, caption });
        notes.push("te l'ho mandato qui su WhatsApp");
      } catch (error) {
        console.error("[office-skills] invio WhatsApp fallito", userId, error?.message || error);
        notes.push("non sono riuscito a inviartelo qui su WhatsApp");
      }
    }
  }
  return notes;
}

function safeFileName(name, fallback) {
  return String(name || fallback).trim().slice(0, 150) || fallback;
}

// --- crea_excel -------------------------------------------------------------------------------

async function previewCreaExcel(args) {
  const fileName = safeFileName(args.fileName, "Foglio");
  const rows = Array.isArray(args.rows) ? args.rows : [];
  const sample = rows
    .slice(0, 5)
    .map((row) => (Array.isArray(row) ? row.join(" | ") : String(row)))
    .join("\n");
  return (
    `Sto per creare il file Excel "${fileName}.xlsx" con ${rows.length} righe. Anteprima:\n${sample}${rows.length > 5 ? "\n…" : ""}\n\n` +
    "Confermi? (sì/no)"
  );
}

async function handleCreaExcel(args, context) {
  const fileName = safeFileName(args.fileName, "Foglio");
  const rows = Array.isArray(args.rows) ? args.rows : [];
  const buffer = await createExcel({ sheetName: args.sheetName || "Foglio1", rows });
  const notes = await deliverGeneratedFile(context.userId, context.channelRef, {
    buffer,
    fileName: `${fileName}.xlsx`,
    mimetype: XLSX_MIME,
    caption: fileName,
  });
  return { message: `Ho creato "${fileName}.xlsx" (${rows.length} righe) — ${notes.join(", ") || "fatto"}.` };
}

registerSkill("crea_excel", {
  description:
    "Crea un nuovo file Excel (.xlsx) con i dati forniti, lo salva su Google Drive e lo invia su WhatsApp. " +
    "Regola non negoziabile: non riempire MAI una cella con un dato inventato. Se mancano valori specifici che l'utente non ha fornito, chiediglieli prima invece di indovinarli o lasciali come stringa vuota.",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "Nome del file, senza estensione" },
      sheetName: { type: "string", description: "Nome del foglio di lavoro" },
      rows: {
        type: "array",
        description: "Righe della tabella, ciascuna un array di celle. La prima riga è tipicamente l'intestazione.",
        items: { type: "array", items: {} },
      },
    },
    required: ["fileName", "rows"],
  },
  needsApproval: true,
  preview: previewCreaExcel,
  handler: handleCreaExcel,
});

// --- leggi_excel (sola lettura, nessuna approvazione) -----------------------------------------

async function handleLeggiExcel(args, context) {
  const connected = await isDriveConnected(context.userId).catch(() => false);
  if (!connected) return { message: "Non ho un Google Drive collegato per cercare il file." };
  const matches = await searchDriveFiles(context.userId, args.fileName, 5).catch(() => []);
  const file = matches.find((item) => /\.xlsx?$/i.test(item.name)) || matches[0];
  if (!file) return { message: `Non ho trovato un file Excel che corrisponde a "${args.fileName}" su Drive.` };
  try {
    const buffer = await downloadDriveFileBuffer(context.userId, file.id);
    const data = await readExcel(buffer);
    const summary = (data.sheets || [])
      .map((sheet) => {
        const preview = (sheet.rows || []).slice(0, 10).map((row) => (row || []).join(" | ")).join("\n");
        return `Foglio "${sheet.name}" (${(sheet.rows || []).length} righe):\n${preview}`;
      })
      .join("\n\n");
    return { message: `Contenuto di "${file.name}":\n\n${summary.slice(0, 3000)}` };
  } catch (error) {
    console.error("[office-skills] lettura Excel fallita", context.userId, error?.message || error);
    return { message: `Ho trovato "${file.name}" ma non sono riuscito a leggerne il contenuto.` };
  }
}

registerSkill("leggi_excel", {
  description: "Cerca e legge il contenuto di un file Excel già presente su Google Drive, per rispondere a domande sui suoi dati.",
  parameters: {
    type: "object",
    properties: { fileName: { type: "string", description: "Nome (anche parziale) del file Excel da cercare su Drive" } },
    required: ["fileName"],
  },
  needsApproval: false,
  handler: handleLeggiExcel,
});

// --- crea_presentazione ------------------------------------------------------------------------

async function previewCreaPresentazione(args) {
  const fileName = safeFileName(args.fileName, "Presentazione");
  const slides = Array.isArray(args.slides) ? args.slides : [];
  const titles = slides.map((slide, index) => `${index + 1}. ${slide.title || "(senza titolo)"}`).join("\n");
  return `Sto per creare la presentazione "${fileName}.pptx" con ${slides.length} diapositive:\n${titles}\n\nConfermi? (sì/no)`;
}

async function handleCreaPresentazione(args, context) {
  const fileName = safeFileName(args.fileName, "Presentazione");
  const slides = Array.isArray(args.slides) ? args.slides : [];
  const buffer = await createPptx({ slides });
  const notes = await deliverGeneratedFile(context.userId, context.channelRef, {
    buffer,
    fileName: `${fileName}.pptx`,
    mimetype: PPTX_MIME,
    caption: fileName,
  });
  return { message: `Ho creato "${fileName}.pptx" (${slides.length} diapositive) — ${notes.join(", ") || "fatto"}.` };
}

registerSkill("crea_presentazione", {
  description: "Crea una presentazione PowerPoint (.pptx) con titoli e punti elenco per diapositiva, e la salva su Drive/WhatsApp.",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string" },
      slides: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } } },
          required: ["title"],
        },
      },
    },
    required: ["fileName", "slides"],
  },
  needsApproval: true,
  preview: previewCreaPresentazione,
  handler: handleCreaPresentazione,
});

// --- crea_documento_word -----------------------------------------------------------------------

async function previewCreaDocumentoWord(args) {
  const fileName = safeFileName(args.fileName, "Documento");
  const sections = Array.isArray(args.sections) ? args.sections : [];
  return `Sto per creare il documento Word "${fileName}.docx" con ${sections.length} sezioni (titolo: "${args.title || fileName}"). Confermi? (sì/no)`;
}

async function handleCreaDocumentoWord(args, context) {
  const fileName = safeFileName(args.fileName, "Documento");
  const sections = Array.isArray(args.sections) ? args.sections : [];
  const buffer = await createDocx({ title: args.title, sections });
  const notes = await deliverGeneratedFile(context.userId, context.channelRef, {
    buffer,
    fileName: `${fileName}.docx`,
    mimetype: DOCX_MIME,
    caption: fileName,
  });
  return { message: `Ho creato "${fileName}.docx" — ${notes.join(", ") || "fatto"}.` };
}

registerSkill("crea_documento_word", {
  description: "Crea un documento Word (.docx) con titolo, sezioni e paragrafi, e lo salva su Drive/WhatsApp.",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string" },
      title: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } },
        },
      },
    },
    required: ["fileName"],
  },
  needsApproval: true,
  preview: previewCreaDocumentoWord,
  handler: handleCreaDocumentoWord,
});

// --- crea_pdf ------------------------------------------------------------------------------------

async function previewCreaPdf(args) {
  const fileName = safeFileName(args.fileName, "Documento");
  const paragraphs = Array.isArray(args.paragraphs) ? args.paragraphs : [];
  const sample = paragraphs.slice(0, 2).join("\n").slice(0, 300);
  return `Sto per creare il PDF "${fileName}.pdf" (${paragraphs.length} paragrafi). Anteprima:\n${sample}${sample.length >= 300 ? "…" : ""}\n\nConfermi? (sì/no)`;
}

async function handleCreaPdf(args, context) {
  const fileName = safeFileName(args.fileName, "Documento");
  const paragraphs = Array.isArray(args.paragraphs) ? args.paragraphs : [];
  const buffer = await createPdf({ title: args.title, paragraphs });
  const notes = await deliverGeneratedFile(context.userId, context.channelRef, {
    buffer,
    fileName: `${fileName}.pdf`,
    mimetype: PDF_MIME,
    caption: fileName,
  });
  return { message: `Ho creato "${fileName}.pdf" — ${notes.join(", ") || "fatto"}.` };
}

registerSkill("crea_pdf", {
  description: "Crea un documento PDF con titolo e paragrafi di testo, e lo salva su Drive/WhatsApp.",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string" },
      title: { type: "string" },
      paragraphs: { type: "array", items: { type: "string" } },
    },
    required: ["fileName", "paragraphs"],
  },
  needsApproval: true,
  preview: previewCreaPdf,
  handler: handleCreaPdf,
});

// --- estrai_testo_pdf (sola lettura, nessuna approvazione) --------------------------------------

async function handleEstraiTestoPdf(args, context) {
  const connected = await isDriveConnected(context.userId).catch(() => false);
  if (!connected) return { message: "Non ho un Google Drive collegato per cercare il file." };
  const matches = await searchDriveFiles(context.userId, args.fileName, 5).catch(() => []);
  const file = matches.find((item) => /\.pdf$/i.test(item.name)) || matches[0];
  if (!file) return { message: `Non ho trovato un PDF che corrisponde a "${args.fileName}" su Drive.` };
  try {
    const buffer = await downloadDriveFileBuffer(context.userId, file.id);
    const text = await extractPdfText(buffer);
    return { message: `Testo estratto da "${file.name}":\n\n${text.slice(0, 3000)}${text.length > 3000 ? "\n…" : ""}` };
  } catch (error) {
    console.error("[office-skills] estrazione PDF fallita", context.userId, error?.message || error);
    return { message: `Ho trovato "${file.name}" ma non sono riuscito a estrarne il testo.` };
  }
}

registerSkill("estrai_testo_pdf", {
  description: "Cerca un PDF su Google Drive ed estrae il testo leggibile al suo interno.",
  parameters: {
    type: "object",
    properties: { fileName: { type: "string", description: "Nome (anche parziale) del file PDF da cercare su Drive" } },
    required: ["fileName"],
  },
  needsApproval: false,
  handler: handleEstraiTestoPdf,
});
