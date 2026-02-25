import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMfaSecret, generateBackupCodes, verifyMfaToken } from "@/lib/mfa";
import { logAudit, getClientIp } from "@/lib/audit";
import QRCode from "qrcode";

/**
 * POST /api/auth/mfa/setup
 * Step 1: Generate MFA secret and QR code. User must verify with a token before activation.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, mfaEnabled: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.mfaEnabled) {
    return NextResponse.json({ error: "MFA is already enabled" }, { status: 400 });
  }

  const { encryptedSecret, otpauthUri, secret } = generateMfaSecret(user.email);

  // Store the secret temporarily (not activated yet — awaiting verification)
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: encryptedSecret },
  });

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  return NextResponse.json({
    qrCode: qrCodeDataUrl,
    secret, // base32 for manual entry
    message: "Scan the QR code with your authenticator app, then verify with a token.",
  });
}

/**
 * PUT /api/auth/mfa/setup
 * Step 2: Verify the TOTP token to activate MFA. Generates backup codes.
 */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token || typeof token !== "string" || token.length !== 6) {
    return NextResponse.json({ error: "A 6-digit token is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, mfaEnabled: true, mfaSecret: true },
  });

  if (!user || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA setup not initiated. Call POST first." }, { status: 400 });
  }

  if (user.mfaEnabled) {
    return NextResponse.json({ error: "MFA is already enabled" }, { status: 400 });
  }

  // Verify the token against the stored secret
  const isValid = verifyMfaToken(user.mfaSecret, token);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid token. Please try again." }, { status: 400 });
  }

  // Generate backup codes
  const { plaintextCodes, encryptedCodes } = generateBackupCodes();

  // Activate MFA
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
      mfaBackupCodes: encryptedCodes,
      mfaVerifiedAt: new Date(),
    },
  });

  await logAudit({
    userId: user.id,
    action: "PASSWORD_CHANGE", // reusing closest action type
    details: "MFA enabled via TOTP",
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    message: "MFA has been activated successfully.",
    backupCodes: plaintextCodes,
    warning: "Save these backup codes in a secure location. They will not be shown again.",
  });
}
