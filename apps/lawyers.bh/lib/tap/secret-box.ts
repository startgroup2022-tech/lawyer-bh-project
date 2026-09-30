import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM box for Tap secret keys stored in the database.
 *
 * The key is derived from `TAP_CONFIG_ENCRYPTION_KEY` (any length; scrypt
 * stretches it). Ciphertext is self-describing (`v1:iv:tag:data`, base64url) so
 * the format can be rotated later without guessing.
 */
const SALT = "lawyers.bh:tap-config:v1";
const PREFIX = "v1";

function encryptionKey(): Buffer {
  const secret = process.env.TAP_CONFIG_ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("TAP_CONFIG_ENCRYPTION_KEY must be set (at least 16 characters) to store Tap credentials");
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptionConfigured(): boolean {
  const secret = process.env.TAP_CONFIG_ENCRYPTION_KEY?.trim();
  return Boolean(secret && secret.length >= 16);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptSecret(payload: string): string | null {
  const [prefix, ivPart, tagPart, dataPart] = payload.split(":");
  if (prefix !== PREFIX || !ivPart || !tagPart || !dataPart) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Shows only the tail of a secret, enough for an admin to recognise it. */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  return `${"•".repeat(Math.min(12, trimmed.length - 4))}${trimmed.slice(-4)}`;
}
