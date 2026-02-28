import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";

// PATCH /api/auth/switch-org — update the active organization for the current session
// The client must call router.refresh() after this to pick up the new session data.
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { organizationId } = body;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  // Verify the user actually belongs to this org
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this organization." },
      { status: 403 }
    );
  }

  await logAudit({
    userId: session.user.id,
    action: "ORG_SWITCHED",
    entityType: "organization",
    entityId: organizationId,
    details: `Switched to organization: ${membership.organization.name}`,
    ipAddress: getClientIp(request),
  });

  // We can't update the JWT directly from an API route — the session is updated
  // on the next JWT refresh via the jwt callback in authOptions.
  // We store the desired org ID in a cookie that the jwt callback reads.
  const response = NextResponse.json({
    message: `Switched to ${membership.organization.name}`,
    organization: membership.organization,
  });

  // Set a short-lived cookie the jwt callback can read to update activeOrganizationId
  response.cookies.set("preferred-org", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60, // 60 seconds — just long enough for the next JWT refresh
    path: "/",
  });

  return response;
}

// GET /api/auth/switch-org — list orgs the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    organizations: memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      isActive: m.organizationId === session.user.activeOrganizationId,
    })),
  });
}
