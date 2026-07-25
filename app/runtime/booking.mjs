import { query } from "./db.mjs";
import { createCalendarEvent, isCalendarConnected, proposeSlots } from "./google-calendar.mjs";

const BOOKING_INTENT_PATTERN = /appuntament|prenot|disponibil|calendari|meeting|fissar.{0,10}(incontr|appuntament)/i;
const CANCEL_PATTERN = /\b(annulla|cancella|niente|lascia stare|no grazie)\b/i;
const ORDINAL_WORDS = { primo: 1, prima: 1, secondo: 2, seconda: 2, terzo: 3, terza: 3 };

function formatSlot(slot) {
  const date = new Date(slot.start);
  const day = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${day} alle ${time}`;
}

function formatSlotList(slots) {
  return slots.map((slot, index) => `${index + 1}. ${formatSlot(slot)}`).join("\n");
}

async function getPendingBooking(userId, channel, channelRef) {
  const result = await query(
    `SELECT * FROM pending_bookings
     WHERE user_id = $1 AND channel = $2 AND channel_ref = $3 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, channel, channelRef],
  );
  return result.rows[0] || null;
}

async function savePendingBooking(userId, channel, channelRef, proposal) {
  await query(`DELETE FROM pending_bookings WHERE user_id = $1 AND channel = $2 AND channel_ref = $3`, [userId, channel, channelRef]);
  await query(
    `INSERT INTO pending_bookings (user_id, channel, channel_ref, proposal, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW() + INTERVAL '30 minutes')`,
    [userId, channel, channelRef, JSON.stringify(proposal)],
  );
}

async function deletePendingBooking(id) {
  await query(`DELETE FROM pending_bookings WHERE id = $1`, [id]);
}

function parseSlotChoice(text, slotCount) {
  const normalized = text.trim().toLowerCase();
  const digitMatch = normalized.match(/\b([1-9])\b/);
  if (digitMatch) {
    const value = Number(digitMatch[1]);
    if (value >= 1 && value <= slotCount) return value;
  }
  for (const [word, value] of Object.entries(ORDINAL_WORDS)) {
    if (normalized.includes(word) && value <= slotCount) return value;
  }
  return null;
}

async function resolvePendingBooking(user, pending, text) {
  const normalized = text.trim().toLowerCase();
  if (CANCEL_PATTERN.test(normalized)) {
    await deletePendingBooking(pending.id);
    return "Va bene, nessun appuntamento fissato. Scrivimi pure quando vuoi riprovare.";
  }

  const slots = pending.proposal.slots;
  const choice = parseSlotChoice(text, slots.length);
  if (!choice) {
    return `Non ho capito quale orario preferisci. Rispondi con il numero:\n\n${formatSlotList(slots)}\n\n(oppure scrivi "annulla" per lasciar perdere)`;
  }

  const slot = slots[choice - 1];
  try {
    await createCalendarEvent(user.id, {
      summary: pending.proposal.summary || `Appuntamento con ${user.name}`,
      description: `Prenotato via ${pending.channel} da ${user.name}${user.email ? " (" + user.email + ")" : ""}.`,
      start: slot.start,
      end: slot.end,
    });
  } catch (error) {
    await deletePendingBooking(pending.id);
    console.error("[booking] creazione evento calendario fallita", user.id, error?.message || error);
    return "Mi dispiace, non sono riuscito a creare l'appuntamento sul calendario. Ti contatteremo noi per fissarlo.";
  }
  await deletePendingBooking(pending.id);
  return `Fatto! Appuntamento confermato per ${formatSlot(slot)}. Riceverai la conferma anche sul calendario.`;
}

/**
 * Intercetta i messaggi che riguardano una prenotazione (in corso o nuova) prima che
 * vengano passati alla risposta RAG generica. Ritorna null se il messaggio non c'entra
 * con le prenotazioni, così il chiamante prosegue con il flusso normale.
 */
export async function handleBookingMessage(user, text, { channel, channelRef }) {
  const pending = await getPendingBooking(user.id, channel, channelRef);
  if (pending) {
    return await resolvePendingBooking(user, pending, text);
  }

  if (!BOOKING_INTENT_PATTERN.test(text)) return null;

  const connected = await isCalendarConnected(user.id);
  if (!connected) return null;

  let slots;
  try {
    slots = await proposeSlots(user.id, {});
  } catch (error) {
    console.error("[booking] impossibile calcolare disponibilità", user.id, error?.message || error);
    return "Al momento non riesco a controllare il calendario. Ti contatteremo noi per fissare un appuntamento.";
  }
  if (!slots.length) {
    return "Al momento non trovo orari liberi nei prossimi giorni. Ti contatteremo noi per fissare un appuntamento.";
  }

  await savePendingBooking(user.id, channel, channelRef, { slots, summary: `Appuntamento con ${user.name}` });
  return `Questi sono gli orari disponibili:\n\n${formatSlotList(slots)}\n\nRispondi con il numero dell'orario che preferisci per confermare, oppure scrivi "annulla".`;
}
