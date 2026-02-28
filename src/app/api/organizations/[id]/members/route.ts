import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";
import { addMemberSchema } from "@/lib/validations/organization";
import { logAudit, getClientIp } from "@/lib/audit";

// POST: Add a member to the organization (OWNER/ADMIN only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Read body first before consuming the stream
  const body = await request.json();

  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
    body: JSON.stringify(body),
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No user found with this email. They must register first." },
      { status: 404 }
    );
  }

  const existingMembership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: id } },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: "User is already a member of this organization" },
      { status: 409 }
    );
  }

  const membership = await prisma.organizationMember.create({
    data: { userId: user.id, organizationId: id, role },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: id,
    action: "ADD_ORG_MEMBER",
    entityType: "organizationMember",
    entityId: membership.id,
    details: `Added ${email} as ${role}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    { id: membership.id, user: membership.user, role: membership.role },
    { status: 201 }
  );
}
