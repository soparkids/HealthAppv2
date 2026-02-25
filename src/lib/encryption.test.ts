import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set encryption secret before importing the module
const TEST_SECRET = "test-encryption-secret-32chars-ok";
process.env.ENCRYPTION_SECRET = TEST_SECRET;

import {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  SENSITIVE_PATIENT_FIELDS,
  SENSITIVE_LAB_RESULT_FIELDS,
  SENSITIVE_MEDICAL_HISTORY_FIELDS,
  SENSITIVE_EYE_CONSULTATION_FIELDS,
  SENSITIVE_REPORT_FIELDS,
} from "./encryption";

describe("encryption", () => {
  describe("encrypt/decrypt", () => {
    it("encrypts and decrypts a string correctly", () => {
      const plaintext = "Patient has diabetes type 2";
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(":"); // iv:authTag:ciphertext format
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it("returns empty string for empty input", () => {
      expect(encrypt("")).toBe("");
      expect(decrypt("")).toBe("");
    });

    it("returns null/undefined inputs unchanged", () => {
      expect(encrypt(null as unknown as string)).toBe(null);
      expect(decrypt(null as unknown as string)).toBe(null);
    });

    it("handles special characters and unicode", () => {
      const plaintext = "Allergies: penicillin, aspirin — NdụMed records (日本語)";
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it("produces different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "Same text";
      const enc1 = encrypt(plaintext);
      const enc2 = encrypt(plaintext);
      expect(enc1).not.toBe(enc2); // Different IVs
      expect(decrypt(enc1)).toBe(plaintext);
      expect(decrypt(enc2)).toBe(plaintext);
    });

    it("returns unencrypted text as-is if it has no colons", () => {
      const legacy = "plain text without colons";
      expect(decrypt(legacy)).toBe(legacy);
    });

    it("returns malformed encrypted text as-is", () => {
      const bad = "not:valid:base64:data";
      expect(decrypt(bad)).toBe(bad);
    });

    it("handles long text (medical report content)", () => {
      const longText = "Detailed findings: ".repeat(500);
      const encrypted = encrypt(longText);
      expect(decrypt(encrypted)).toBe(longText);
    });
  });

  describe("encryptFields", () => {
    it("encrypts specified fields only", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        allergies: "Penicillin",
        medications: "Metformin",
        phone: "1234567890",
      };

      const result = encryptFields(data, ["allergies", "medications"]);
      expect(result.firstName).toBe("John"); // unchanged
      expect(result.lastName).toBe("Doe"); // unchanged
      expect(result.phone).toBe("1234567890"); // unchanged
      expect(result.allergies).not.toBe("Penicillin"); // encrypted
      expect(result.medications).not.toBe("Metformin"); // encrypted
    });

    it("skips null/undefined fields", () => {
      const data = { allergies: null, medications: undefined, notes: "test" };
      const result = encryptFields(data, ["allergies", "medications", "notes"]);
      expect(result.allergies).toBe(null);
      expect(result.medications).toBe(undefined);
      expect(result.notes).not.toBe("test"); // encrypted
    });
  });

  describe("decryptFields", () => {
    it("decrypts previously encrypted fields", () => {
      const data = {
        firstName: "John",
        allergies: encrypt("Penicillin"),
        medications: encrypt("Metformin"),
      };

      const result = decryptFields(data, ["allergies", "medications"]);
      expect(result.firstName).toBe("John");
      expect(result.allergies).toBe("Penicillin");
      expect(result.medications).toBe("Metformin");
    });

    it("handles legacy unencrypted data gracefully", () => {
      const data = {
        allergies: "plain text allergies",
        medications: encrypt("Metformin"),
      };

      const result = decryptFields(data, ["allergies", "medications"]);
      expect(result.allergies).toBe("plain text allergies"); // returned as-is
      expect(result.medications).toBe("Metformin"); // decrypted
    });
  });

  describe("sensitive field constants", () => {
    it("defines patient sensitive fields", () => {
      expect(SENSITIVE_PATIENT_FIELDS).toContain("allergies");
      expect(SENSITIVE_PATIENT_FIELDS).toContain("medicalConditions");
      expect(SENSITIVE_PATIENT_FIELDS).toContain("medications");
      expect(SENSITIVE_PATIENT_FIELDS).toContain("emergencyContact");
    });

    it("defines lab result sensitive fields", () => {
      expect(SENSITIVE_LAB_RESULT_FIELDS).toContain("resultValue");
      expect(SENSITIVE_LAB_RESULT_FIELDS).toContain("notes");
    });

    it("defines medical history sensitive fields", () => {
      expect(SENSITIVE_MEDICAL_HISTORY_FIELDS).toContain("medicalConditions");
      expect(SENSITIVE_MEDICAL_HISTORY_FIELDS).toContain("medications");
    });

    it("defines eye consultation sensitive fields", () => {
      expect(SENSITIVE_EYE_CONSULTATION_FIELDS).toContain("chiefComplaint");
      expect(SENSITIVE_EYE_CONSULTATION_FIELDS).toContain("diagnosis");
      expect(SENSITIVE_EYE_CONSULTATION_FIELDS).toContain("plan");
    });

    it("defines report sensitive fields", () => {
      expect(SENSITIVE_REPORT_FIELDS).toContain("content");
      expect(SENSITIVE_REPORT_FIELDS).toContain("summary");
      expect(SENSITIVE_REPORT_FIELDS).toContain("keyFindings");
    });
  });

  describe("missing ENCRYPTION_SECRET", () => {
    it("throws when ENCRYPTION_SECRET is not set", () => {
      const original = process.env.ENCRYPTION_SECRET;
      delete process.env.ENCRYPTION_SECRET;
      expect(() => encrypt("test")).toThrow("ENCRYPTION_SECRET");
      process.env.ENCRYPTION_SECRET = original;
    });
  });
});
