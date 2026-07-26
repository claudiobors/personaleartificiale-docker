import { instanceNameForUser, sendWhatsAppDocument } from "./evolution.mjs";
import { createDriveFile, ensureDriveFolder, isDriveConnected } from "./google-drive.mjs";
import { generateImage } from "./image-generation.mjs";
import { registerSkill } from "./skills.mjs";

const GENERATED_FOLDER_NAME = "Assistente - File Generati";

const ASPECT_LABELS = { square: "quadrata (FLUX.1-schnell)", landscape: "orizzontale (Stable Diffusion XL)", portrait: "verticale (Stable Diffusion XL)" };

function safeFileName(name) {
  return String(name || "immagine").trim().slice(0, 100).replace(/[^\w\- ]/g, "").trim() || "immagine";
}

async function previewGeneraImmagine(args) {
  const aspect = ASPECT_LABELS[args.aspect] ? args.aspect : "square";
  return `Sto per generare un'immagine ${ASPECT_LABELS[aspect]} con questa descrizione: "${args.prompt}".\n\nConfermi? (sì/no)`;
}

async function handleGeneraImmagine(args, context) {
  const aspect = ASPECT_LABELS[args.aspect] ? args.aspect : "square";
  let image;
  try {
    image = await generateImage({ prompt: args.prompt, aspect });
  } catch (error) {
    console.error("[image-skills] generazione immagine fallita", context.userId, error?.message || error);
    return { message: "Non sono riuscito a generare l'immagine in questo momento." };
  }

  const extension = image.mimetype.includes("png") ? "png" : "jpg";
  const fileName = `${safeFileName(args.fileName || args.prompt?.slice(0, 40))}.${extension}`;
  const notes = [];

  const driveConnected = await isDriveConnected(context.userId).catch(() => false);
  if (driveConnected) {
    try {
      const folderId = await ensureDriveFolder(context.userId, GENERATED_FOLDER_NAME);
      await createDriveFile(context.userId, { name: fileName, content: image.buffer, mimeType: image.mimetype, parentId: folderId });
      notes.push(`salvata su Drive in "${GENERATED_FOLDER_NAME}"`);
    } catch (error) {
      console.error("[image-skills] salvataggio Drive fallito", context.userId, error?.message || error);
      notes.push("non sono riuscito a salvarla su Drive");
    }
  }

  if (context.channelRef) {
    const instanceName = await instanceNameForUser(context.userId).catch(() => null);
    if (instanceName) {
      try {
        await sendWhatsAppDocument(instanceName, context.channelRef, {
          buffer: image.buffer,
          fileName,
          mimetype: image.mimetype,
          caption: args.prompt,
          mediatype: "image",
        });
        notes.push("te l'ho mandata qui su WhatsApp");
      } catch (error) {
        console.error("[image-skills] invio WhatsApp fallito", context.userId, error?.message || error);
        notes.push("non sono riuscito a inviartela su WhatsApp");
      }
    }
  }

  return { message: `Immagine generata — ${notes.join(", ") || "fatto"}.` };
}

registerSkill("genera_immagine", {
  description:
    "Genera un'immagine da una descrizione testuale (FLUX.1-schnell per formato quadrato, Stable Diffusion XL per orizzontale/verticale) " +
    "e la invia su WhatsApp e su Google Drive.",
  parameters: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "Descrizione dettagliata dell'immagine da generare, idealmente in inglese per risultati migliori" },
      aspect: { type: "string", enum: ["square", "landscape", "portrait"], description: "Formato dell'immagine (default: square)" },
      fileName: { type: "string", description: "Nome breve per il file, senza estensione" },
    },
    required: ["prompt"],
  },
  needsApproval: true,
  preview: previewGeneraImmagine,
  handler: handleGeneraImmagine,
});
