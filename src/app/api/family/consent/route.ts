import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/family/consent?token=xxx&action=accept|reject
// Processes consent token — requires authenticated user who is the family member
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Redirect to login with return URL
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search;
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`, request.url)
    );
  }

  const token = request.nextUrl.searchParams.get("token");
  const action = request.nextUrl.searchParams.get("action");

  if (!token || !action || !["accept", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid request. Token and action (accept/reject) are required." },
      { status: 400 }
    );
  }

  const familyMember = await prisma.familyMember.findUnique({
    where: { consentToken: token },
    include: {
      user: { select: { name: true, email: true } },
      member: { select: { id: true, name: true, email: true } },
    },
  });

  if (!familyMember) {
    return NextResponse.json(
      { error: "Invalid or expired consent token." },
      { status: 404 }
    );
  }

  // Verify the logged-in user is the family member being asked for consent
  if (familyMember.memberUserId !== session.user.id) {
    return NextResponse.json(
      { error: "This consent request is not for your account." },
      { status: 403 }
    );
  }

  // Check token expiry
  if (familyMember.consentTokenExpiry && familyMember.consentTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "This consent link has expired. Ask the requester to send a new invitation." },
      { status: 410 }
    );
  }

  // Already responded
  if (familyMember.consentRespondedAt) {
    return NextResponse.json({
      message: `You have already ${familyMember.consentGiven ? "accepted" : "declined"} this request.`,
      status: familyMember.consentGiven ? "accepted" : "rejected",
    });
  }

  // Process the consent
  const isAccepted = action === "accept";

  await prisma.familyMember.update({
    where: { consentToken: token },
    data: {
      consentGiven: isAccepted,
      consentRespondedAt: new Date(),
      consentToken: null, // Invalidate token after use
      consentTokenExpiry: null,
    },
  });

  return NextResponse.json({
    message: isAccepted
      ? `You have accepted ${familyMember.user.name || "the request"}. You can now view shared medical records.`
      : `You have declined ${familyMember.user.name || "the request"}. No records will be shared.`,
    status: isAccepted ? "accepted" : "rejected",
  });
}

// POST /api/family/consent — for the family member to accept/reject from the UI
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { familyMemberId, action } = body;

  if (!familyMemberId || !action || !["accept", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "familyMemberId and action (accept/reject) are required." },
      { status: 400 }
    );
  }

  // Find the family member record where the current user IS the member
  const familyMember = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      memberUserId: session.user.id,
    },
  });

  if (!familyMember) {
    return NextResponse.json(
      { error: "Family connection not found." },
      { status: 404 }
    );
  }

  const isAccepted = action === "accept";

  await prisma.familyMember.update({
    where: { id: familyMemberId },
    data: {
      consentGiven: isAccepted,
      consentRespondedAt: new Date(),
      consentToken: null,
      consentTokenExpiry: null,
    },
  });

  return NextResponse.json({
    message: isAccepted ? "Consent granted." : "Consent declined.",
    consentGiven: isAccepted,
  });
}
