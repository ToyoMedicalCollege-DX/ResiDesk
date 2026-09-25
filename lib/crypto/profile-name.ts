import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import {
  isEncryptedProfileName,
  PROFILE_NAME_CIPHER_PREFIX,
} from "@/lib/crypto/profile-name-format";

export { isEncryptedProfileName } from "@/lib/crypto/profile-name-format";

/**
 * profiles.name 用 AES-256-GCM。学生アプリと同一形式。
 * 形式: enc:v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>
 * 鍵はサーバー env のみ。ブラウザに出さない。
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  let raw = process.env.PROFILE_NAME_ENCRYPTION_KEY?.trim() ?? "";
  raw = raw.replace(/^\uFEFF/, "").replace(/^["']|["']$/g, "").trim();
  if (!raw) {
    throw new Error(
      "PROFILE_NAME_ENCRYPTION_KEY が未設定です。.env.local に学生アプリと同じ鍵を設定してください。"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `PROFILE_NAME_ENCRYPTION_KEY は Base64 デコード後 32 バイト必要です（現在 ${key.length} バイト）。`
    );
  }
  return key;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/\//g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function encryptProfileName(plain: string): string {
  const trimmed = plain.trim();
  if (!trimmed) throw new Error("名前が空です");
  if (isEncryptedProfileName(trimmed)) return trimmed;

  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PROFILE_NAME_CIPHER_PREFIX}${b64url(iv)}:${b64url(tag)}:${b64url(enc)}`;
}

export function decryptProfileName(stored: string): string {
  const value = stored.trim();
  if (!value) return "";
  if (!isEncryptedProfileName(value)) return value;

  const body = value.slice(PROFILE_NAME_CIPHER_PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("名前の暗号形式が不正です");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = getKey();
  const iv = fromB64url(ivB64);
  const tag = fromB64url(tagB64);
  const data = fromB64url(dataB64);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function safeDisplayName(stored: string, fallback: string): string {
  try {
    const plain = decryptProfileName(stored).trim();
    return plain || fallback;
  } catch {
    return fallback;
  }
}
