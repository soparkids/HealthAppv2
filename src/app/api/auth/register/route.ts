import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { sendVerificationEmail, isSmtpConfigured } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`register:${ip}`, AUTH_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const smtpReady = isSmtpConfigured();
    const verificationToken = smtpReady ? crypto.randomBytes(32).toString("hex") : null;
    const verificationExpiry = smtpReady ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        emailVerified: !smtpReady, // Auto-verify if no SMTP configured
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: "REGISTER",
      entityType: "user",
      entityId: user.id,
      details: `Registered as ${role}`,
      ipAddress: ip,
    });

    // Send verification email if SMTP is configured
    if (smtpReady && verificationToken) {
      try {
        await sendVerificationEmail(user.email, verificationToken, user.name);
      } catch (emailErr) {
        console.warn("Failed to send verification email on registration:", emailErr);
      }
    }

    const message = smtpReady
      ? "Account created successfully. Please check your email to verify your account."
      : "Account created successfully.";

    return NextResponse.json({ message, user }, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
