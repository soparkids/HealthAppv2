import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";
import crypto from "crypto";

// POST /api/auth/send-verification — resend/send verification email
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(`send-verification:${session.user.id}`, {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000, // 3 per 15 min
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before requesting another verification email." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Email is already verified." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiry: expiry,
    },
  });

  // Send email (non-blocking — degrade gracefully if SMTP not configured)
  try {
    await sendVerificationEmail(user.email, token, user.name);
  } catch (err) {
    console.warn("Failed to send verification email:", err);
    return NextResponse.json(
      { error: "Failed to send verification email. Please check your SMTP configuration." },
      { status: 503 }
    );
  }

  void ip; // used for future audit logging

  return NextResponse.json({ message: "Verification email sent. Check your inbox." });
}
