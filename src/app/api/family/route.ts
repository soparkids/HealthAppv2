import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/features";
import { sendFamilyConsentEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow reading existing family members even if feature is disabled (only block writes)

  // Get family members the user added
  const addedMembers = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    include: {
      member: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get pending consent requests FOR the current user (they were added by someone else)
  const pendingRequests = await prisma.familyMember.findMany({
    where: {
      memberUserId: session.user.id,
      consentRespondedAt: null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    members: addedMembers,
    pendingRequests,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = request.headers.get("x-organization-id");
  if (orgId) {
    const featureCheck = await requireFeature(orgId, "family_management");
    if (featureCheck) return featureCheck;
  }

  const body = await request.json();
  const { email, relationship } = body;

  if (!email || !relationship) {
    return NextResponse.json(
      { error: "Email and relationship are required" },
      { status: 400 }
    );
  }

  const memberUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!memberUser) {
    return NextResponse.json(
      { error: "No user found with this email address" },
      { status: 404 }
    );
  }

  if (memberUser.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot add yourself as a family member" },
      { status: 400 }
    );
  }

  const existing = await prisma.familyMember.findUnique({
    where: {
      userId_memberUserId: {
        userId: session.user.id,
        memberUserId: memberUser.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This person is already a family member" },
      { status: 409 }
    );
  }

  // Generate consent token (expires in 7 days)
  const consentToken = crypto.randomBytes(32).toString("hex");
  const consentTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const familyMember = await prisma.familyMember.create({
    data: {
      userId: session.user.id,
      memberUserId: memberUser.id,
      relationship,
      consentToken,
      consentTokenExpiry,
    },
    include: {
      member: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  // Send consent email with accept/reject links (non-blocking)
  try {
    await sendFamilyConsentEmail(
      memberUser.email,
      memberUser.name,
      session.user.name,
      consentToken
    );
  } catch (emailError) {
    console.error("Failed to send family consent email:", emailError);
  }

  return NextResponse.json(familyMember, { status: 201 });
}
