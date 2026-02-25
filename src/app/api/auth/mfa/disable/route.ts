import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMfaToken } from "@/lib/mfa";
import { logAudit, getClientIp } from "@/lib/audit";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/mfa/disable
 * Disable MFA. Requires current password + valid TOTP token for security.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { password, token } = body;

  if (!password || !token) {
    return NextResponse.json({ error: "Password and MFA token are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, mfaEnabled: true, mfaSecret: true },
  });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA is not enabled" }, { status: 400 });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }

  // Verify TOTP token
  const isTokenValid = verifyMfaToken(user.mfaSecret, token);
  if (!isTokenValid) {
    return NextResponse.json({ error: "Invalid MFA token" }, { status: 400 });
  }

  // Disable MFA
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaVerifiedAt: null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "PASSWORD_CHANGE",
    details: "MFA disabled",
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ message: "MFA has been disabled." });
}
