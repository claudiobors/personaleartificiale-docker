import { searchPersonEmail } from "./gmail.mjs";
import { listEmailDrafts } from "./email-integration.mjs";
import { registerSkill } from "./skills.mjs";

// Solo lettura: l'invio di email resta sempre gestito dal titolare dalla dashboard (bozze) o dal
// modulo Triage per la delega, mai in autonomia libera durante una conversazione qualsiasi.

async function handleGmailCercaContatto(args, context) {
  const found = await searchPersonEmail(context.userId, args.name).catch((error) => {
    console.error("[gmail-skills] ricerca contatto fallita", context.userId, error?.message || error);
    return null;
  });
  if (!found?.email) return { message: `Non ho trovato un indirizzo email verificato per "${args.name}" nella cronologia Gmail.` };
  return { message: `${found.email}${found.confident ? "" : " (trovato ma non del tutto certo, verifica prima di usarlo)"}` };
}

registerSkill("gmail_cerca_contatto", {
  description:
    "Cerca l'indirizzo email di una persona nella cronologia reale di Gmail (mittenti/destinatari di email scambiate davvero). " +
    "Non inventare mai un indirizzo: se questa skill non trova nulla, dillo chiaramente e chiedi l'indirizzo all'utente.",
  parameters: {
    type: "object",
    properties: { name: { type: "string", description: "Nome (o parte di esso) della persona da cercare" } },
    required: ["name"],
  },
  needsApproval: false,
  requiresIntegration: "gmail",
  handler: handleGmailCercaContatto,
});

async function handleEmailBozzeInSospeso(args, context) {
  const drafts = await listEmailDrafts(context.userId).catch((error) => {
    console.error("[gmail-skills] lettura bozze fallita", context.userId, error?.message || error);
    return null;
  });
  if (drafts === null) return { message: "Non riesco a controllare le bozze email in questo momento." };
  if (!drafts.length) return { message: "Non hai bozze di risposta email in sospeso." };
  const list = drafts
    .slice(0, 10)
    .map((draft) => `- Da ${draft.to}, oggetto "${draft.subject}"`)
    .join("\n");
  return { message: `Hai ${drafts.length} bozze in sospeso${drafts.length > 10 ? " (mostro le prime 10)" : ""}:\n${list}` };
}

registerSkill("email_bozze_in_sospeso", {
  description: "Controlla quante bozze di risposta email sono in sospeso (già preparate ma non ancora riviste/inviate dal titolare) e le riassume.",
  parameters: { type: "object", properties: {} },
  needsApproval: false,
  handler: handleEmailBozzeInSospeso,
});
