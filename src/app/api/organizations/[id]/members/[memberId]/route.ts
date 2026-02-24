import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";
import { updateMemberRoleSchema } from "@/lib/validations/organization";
import { logAudit, getClientIp } from "@/lib/audit";

// PUT: Update member role (OWNER/ADMIN only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
    body: request.body,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.organizationId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot change the owner's role" },
      { status: 400 }
    );
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: id,
    action: "UPDATE_ORG_MEMBER_ROLE",
    entityType: "organizationMember",
    entityId: memberId,
    details: `Changed role to ${parsed.data.role}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ id: updated.id, user: updated.user, role: updated.role });
}

// DELETE: Remove member (OWNER/ADMIN only, cannot remove owner)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { email: true } } },
  });
  if (!member || member.organizationId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove the organization owner" },
      { status: 400 }
    );
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  await logAudit({
    userId: auth.userId,
    organizationId: id,
    action: "REMOVE_ORG_MEMBER",
    entityType: "organizationMember",
    entityId: memberId,
    details: `Removed ${member.user.email}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ message: "Member removed" });
}
