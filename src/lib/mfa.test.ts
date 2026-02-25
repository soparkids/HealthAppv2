import { describe, it, expect } from "vitest";
import * as OTPAuth from "otpauth";

// Set encryption secret before importing
process.env.ENCRYPTION_SECRET = "test-mfa-encryption-secret-32chars";

import {
  generateMfaSecret,
  verifyMfaToken,
  generateBackupCodes,
  verifyBackupCode,
} from "./mfa";
import { decrypt } from "./encryption";

describe("MFA", () => {
  describe("generateMfaSecret", () => {
    it("generates a secret with encrypted secret, otpauth URI, and base32 secret", () => {
      const result = generateMfaSecret("test@example.com");
      expect(result.encryptedSecret).toBeTruthy();
      expect(result.encryptedSecret).toContain(":"); // encrypted format
      expect(result.otpauthUri).toContain("otpauth://totp/");
      // URI-encoded: @ becomes %40 in otpauth URIs
      expect(result.otpauthUri).toContain("test%40example.com");
      expect(result.otpauthUri).toMatch(/Nd.*Med/); // NdụMed (may be URI-encoded)
      expect(result.secret).toBeTruthy();
      expect(result.secret.length).toBeGreaterThan(10); // base32 encoded
    });

    it("generates unique secrets each time", () => {
      const a = generateMfaSecret("test@example.com");
      const b = generateMfaSecret("test@example.com");
      expect(a.secret).not.toBe(b.secret);
    });
  });

  describe("verifyMfaToken", () => {
    it("verifies a valid TOTP token", () => {
      const { encryptedSecret } = generateMfaSecret("test@example.com");
      const secretBase32 = decrypt(encryptedSecret);
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secretBase32),
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });
      const validToken = totp.generate();

      expect(verifyMfaToken(encryptedSecret, validToken)).toBe(true);
    });

    it("rejects an invalid token", () => {
      const { encryptedSecret } = generateMfaSecret("test@example.com");
      expect(verifyMfaToken(encryptedSecret, "000000")).toBe(false);
    });
  });

  describe("generateBackupCodes", () => {
    it("generates 10 backup codes", () => {
      const { plaintextCodes, encryptedCodes } = generateBackupCodes();
      expect(plaintextCodes).toHaveLength(10);
      expect(encryptedCodes).toContain(":"); // encrypted format
    });

    it("generates 8-character hex codes", () => {
      const { plaintextCodes } = generateBackupCodes();
      for (const code of plaintextCodes) {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      }
    });

    it("generates unique codes", () => {
      const { plaintextCodes } = generateBackupCodes();
      const unique = new Set(plaintextCodes);
      expect(unique.size).toBe(10);
    });
  });

  describe("verifyBackupCode", () => {
    it("verifies a valid backup code", () => {
      const { plaintextCodes, encryptedCodes } = generateBackupCodes();
      const result = verifyBackupCode(encryptedCodes, plaintextCodes[0]);
      expect(result.valid).toBe(true);
      expect(result.updatedEncryptedCodes).not.toBe(encryptedCodes);
    });

    it("rejects an invalid backup code", () => {
      const { encryptedCodes } = generateBackupCodes();
      const result = verifyBackupCode(encryptedCodes, "INVALID0");
      expect(result.valid).toBe(false);
      expect(result.updatedEncryptedCodes).toBe(encryptedCodes); // unchanged
    });

    it("removes used code from the list", () => {
      const { plaintextCodes, encryptedCodes } = generateBackupCodes();
      const firstCode = plaintextCodes[0];

      // First use: valid
      const result1 = verifyBackupCode(encryptedCodes, firstCode);
      expect(result1.valid).toBe(true);

      // Second use: invalid (code consumed)
      const result2 = verifyBackupCode(result1.updatedEncryptedCodes, firstCode);
      expect(result2.valid).toBe(false);
    });

    it("is case-insensitive", () => {
      const { plaintextCodes, encryptedCodes } = generateBackupCodes();
      const result = verifyBackupCode(encryptedCodes, plaintextCodes[0].toLowerCase());
      expect(result.valid).toBe(true);
    });

    it("trims whitespace", () => {
      const { plaintextCodes, encryptedCodes } = generateBackupCodes();
      const result = verifyBackupCode(encryptedCodes, `  ${plaintextCodes[0]}  `);
      expect(result.valid).toBe(true);
    });
  });
});
