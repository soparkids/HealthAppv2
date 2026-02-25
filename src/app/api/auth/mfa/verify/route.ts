import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMfaToken, verifyBackupCode } from "@/lib/mfa";
import { logAudit, getClientIp } from "@/lib/audit";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

/**
 * POST /api/auth/mfa/verify
 * Verify MFA token during login flow.
 * Accepts either a 6-digit TOTP token or an 8-char backup code.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, token, backupCode } = body;

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Rate limit MFA verification attempts
  const rateLimitKey = `mfa:${userId}`;
  const rateCheck = checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many MFA attempts. Please try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, mfaEnabled: true, mfaSecret: true, mfaBackupCodes: true },
  });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA not enabled for this user" }, { status: 400 });
  }

  // Try TOTP token first
  if (token) {
    if (typeof token !== "string" || token.length !== 6) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const isValid = verifyMfaToken(user.mfaSecret, token);
    if (isValid) {
      await logAudit({
        userId: user.id,
        action: "LOGIN",
        details: "MFA verification successful (TOTP)",
        ipAddress: getClientIp(request),
      });
      return NextResponse.json({ verified: true });
    }

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      details: "MFA verification failed (TOTP)",
      ipAddress: getClientIp(request),
    });
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Try backup code
  if (backupCode && user.mfaBackupCodes) {
    const result = verifyBackupCode(user.mfaBackupCodes, backupCode);
    if (result.valid) {
      // Update remaining backup codes
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaBackupCodes: result.updatedEncryptedCodes },
      });

      await logAudit({
        userId: user.id,
        action: "LOGIN",
        details: "MFA verification successful (backup code)",
        ipAddress: getClientIp(request),
      });
      return NextResponse.json({ verified: true, backupCodeUsed: true });
    }

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      details: "MFA verification failed (backup code)",
      ipAddress: getClientIp(request),
    });
    return NextResponse.json({ error: "Invalid backup code" }, { status: 400 });
  }

  return NextResponse.json({ error: "Token or backup code required" }, { status: 400 });
}
