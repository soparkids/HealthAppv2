import * as OTPAuth from "otpauth";
import { createHash, randomBytes } from "crypto";
import { encrypt, decrypt } from "@/lib/encryption";

const ISSUER = "NdụMed";
const BACKUP_CODE_COUNT = 10;

/**
 * Generate a new TOTP secret for a user.
 * Returns the encrypted secret and the otpauth URI for QR code generation.
 */
export function generateMfaSecret(userEmail: string): {
  encryptedSecret: string;
  otpauthUri: string;
  secret: string; // base32 for manual entry
} {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;
  const encryptedSecret = encrypt(secret);
  const otpauthUri = totp.toString();

  return { encryptedSecret, otpauthUri, secret };
}

/**
 * Verify a TOTP token against an encrypted secret.
 */
export function verifyMfaToken(encryptedSecret: string, token: string): boolean {
  const secret = decrypt(encryptedSecret);
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // Allow 1 period window (±30 seconds)
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Generate backup codes and return them encrypted for storage + plaintext for display.
 */
export function generateBackupCodes(): {
  plaintextCodes: string[];
  encryptedCodes: string; // encrypted JSON of hashed codes
} {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase(); // 8-char hex code
    codes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }

  return {
    plaintextCodes: codes,
    encryptedCodes: encrypt(JSON.stringify(hashedCodes)),
  };
}

/**
 * Verify a backup code and remove it from the list.
 * Returns the updated encrypted codes (with the used code removed) or null if invalid.
 */
export function verifyBackupCode(
  encryptedCodes: string,
  code: string
): { valid: boolean; updatedEncryptedCodes: string } {
  const hashedCodes: string[] = JSON.parse(decrypt(encryptedCodes));
  const inputHash = hashBackupCode(code.toUpperCase().trim());

  const index = hashedCodes.indexOf(inputHash);
  if (index === -1) {
    return { valid: false, updatedEncryptedCodes: encryptedCodes };
  }

  // Remove used code
  hashedCodes.splice(index, 1);
  return {
    valid: true,
    updatedEncryptedCodes: encrypt(JSON.stringify(hashedCodes)),
  };
}

function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
