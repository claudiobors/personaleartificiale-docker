import { query } from "./db.mjs";

const registry = new Map();

const CONFIRM_WORDS = ["si", "sì", "ok", "va bene", "confermo", "procedi"];
const CANCEL_WORDS = ["annulla", "cancella", "niente", "lascia stare", "no grazie", "no"];

function isConfirmation(text) {
  const normalized = text.trim().toLowerCase();
  return CONFIRM_WORDS.some((word) => normalized === word || normalized.includes(word));
}

function isCancellation(text) {
  const normalized = text.trim().toLowerCase();
  return CANCEL_WORDS.some((word) => normalized === word || normalized.includes(word));
}

// Registra una skill richiamabile dal motore di function-calling dell'assistente.
// - handler(args, context): esegue l'azione ed è l'unico punto che tocca il mondo esterno.
// - needsApproval + preview: se true, la prima invocazione mostra solo un'anteprima testuale e salva
//   un'azione in sospeso; l'esecuzione vera avviene solo dopo conferma esplicita dell'utente (mai un'azione
//   scrivente eseguita in autonomia, coerente con il resto della piattaforma).
export function registerSkill(name, { description, parameters, handler, needsApproval = false, preview = null }) {
  registry.set(name, { description, parameters, handler, needsApproval, preview });
}

export function getToolDefinitions() {
  return [...registry.entries()].map(([name, skill]) => ({
    type: "function",
    function: { name, description: skill.description, parameters: skill.parameters },
  }));
}

export function hasSkills() {
  return registry.size > 0;
}

async function getPendingAction(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM pending_tool_actions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

async function savePendingAction(userId, channel, channelRef, { toolName, args, preview }) {
  await query(`DELETE FROM pending_tool_actions WHERE user_id = $1 AND channel = $2 AND channel_ref = $3`, [userId, channel, channelRef]);
  await query(
    `INSERT INTO pending_tool_actions (user_id, channel, channel_ref, tool_name, args, preview, expires_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW() + INTERVAL '15 minutes')`,
    [userId, channel, channelRef, toolName, JSON.stringify(args), preview],
  );
}

async function deletePendingAction(id) {
  await query(`DELETE FROM pending_tool_actions WHERE id = $1`, [id]);
}

// Controllata ad ogni messaggio PRIMA di richiamare il modello: se c'è un'azione in sospeso la risolve
// in modo deterministico (conferma/annulla), senza ripassare dal motore di function-calling.
export async function resolvePendingSkillAction(userId, channel, channelRef, text) {
  const pending = await getPendingAction(userId, channel, channelRef);
  if (!pending) return null;

  if (isCancellation(text)) {
    await deletePendingAction(pending.id);
    return "Va bene, non ho fatto nulla.";
  }
  if (!isConfirmation(text)) {
    return `Non ho capito: rispondi "sì" per confermare o "annulla" per lasciar perdere.\n\n${pending.preview}`;
  }

  const skill = registry.get(pending.tool_name);
  if (!skill) {
    await deletePendingAction(pending.id);
    return "Questa azione non è più disponibile.";
  }
  try {
    const result = await skill.handler(pending.args, { userId, channel, channelRef, confirmed: true });
    await deletePendingAction(pending.id);
    return result?.message || "Fatto.";
  } catch (error) {
    await deletePendingAction(pending.id);
    console.error("[skills] esecuzione azione confermata fallita", userId, pending.tool_name, error?.message || error);
    return "Non sono riuscito a completare l'operazione.";
  }
}

export async function executeTool(name, args, context) {
  const skill = registry.get(name);
  if (!skill) return { message: `Skill "${name}" non disponibile.` };
  try {
    if (skill.needsApproval) {
      const previewText = await skill.preview(args, context);
      await savePendingAction(context.userId, context.channel, context.channelRef, { toolName: name, args, preview: previewText });
      return { message: previewText, pendingApproval: true };
    }
    return await skill.handler(args, { ...context, confirmed: false });
  } catch (error) {
    console.error("[skills] esecuzione skill fallita", name, context?.userId, error?.message || error);
    return { message: "Non sono riuscito a eseguire questa azione in questo momento." };
  }
}
