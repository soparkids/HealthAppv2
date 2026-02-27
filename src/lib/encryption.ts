import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is required for field-level encryption");
  }
  // Use a fixed salt derived from the secret itself for deterministic key derivation
  // This ensures the same key is derived each time without needing to store a separate salt
  const salt = scryptSync(secret, "ndumed-salt-v1", SALT_LENGTH);
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string in the format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string (iv:authTag:ciphertext format).
 * Returns the original plaintext.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  // If the text doesn't look encrypted (no colons), return as-is
  // This handles legacy unencrypted data gracefully
  if (!encryptedText.includes(":")) return encryptedText;

  const parts = encryptedText.split(":");
  if (parts.length !== 3) return encryptedText;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const ciphertext = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, return original text (handles legacy unencrypted data)
    return encryptedText;
  }
}

/**
 * Encrypt multiple fields on an object. Returns a new object with specified fields encrypted.
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as Record<string, unknown>)[field as string] = encrypt(value);
    }
  }
  return result;
}

/**
 * Decrypt multiple fields on an object. Returns a new object with specified fields decrypted.
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as Record<string, unknown>)[field as string] = decrypt(value);
    }
  }
  return result;
}

// Define which fields are sensitive per model
export const SENSITIVE_PATIENT_FIELDS = [
  "allergies",
  "medicalConditions",
  "medications",
  "notes",
  "emergencyContact",
  "emergencyPhone",
] as const;

export const SENSITIVE_LAB_RESULT_FIELDS = [
  "resultValue",
  "notes",
  "interpretationText",
  "recommendations",
] as const;

export const SENSITIVE_INTERPRETATION_FIELDS = [
  "interpretation",
  "summary",
  "recommendations",
] as const;

export const SENSITIVE_MEDICAL_HISTORY_FIELDS = [
  "medicalConditions",
  "medications",
  "notes",
] as const;

export const SENSITIVE_EYE_CONSULTATION_FIELDS = [
  "chiefComplaint",
  "diagnosis",
  "plan",
] as const;

export const SENSITIVE_REPORT_FIELDS = [
  "content",
  "summary",
  "keyFindings",
] as const;

export const SENSITIVE_EQUIPMENT_FIELDS = [
  "notes",
] as const;

export const SENSITIVE_PREDICTION_ALERT_FIELDS = [
  "recommendedAction",
] as const;
