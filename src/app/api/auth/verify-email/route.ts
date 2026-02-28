import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";

// GET /api/auth/verify-email?token=xxx
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      emailVerificationExpiry: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Email already verified.", alreadyVerified: true });
  }

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    return NextResponse.json(
      { error: "This verification link has expired. Please request a new one." },
      { status: 410 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "EMAIL_VERIFIED",
    entityType: "user",
    entityId: user.id,
    details: `Email verified: ${user.email}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ message: "Email verified successfully.", email: user.email });
}
