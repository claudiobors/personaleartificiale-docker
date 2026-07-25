import crypto from "node:crypto";
import { apiError } from "./auth.mjs";

function encryptionKey() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) {
    throw apiError(503, "INTEGRATIONS_ENCRYPTION_KEY non configurata: le credenziali delle integrazioni non possono essere salvate in sicurezza.", "secrets_not_configured");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText) {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText ?? ""), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload) {
  if (!payload) return "";
  const key = encryptionKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
