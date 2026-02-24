import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const followUp = await prisma.followUp.findFirst({
    where: { id, userId: auth.userId },
    include: {
      medicalRecord: {
        select: { id: true, title: true, type: true, recordDate: true },
      },
    },
  });

  if (!followUp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(followUp);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.followUp.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.status) updateData.status = body.status;
  if (body.recommendation) updateData.recommendation = body.recommendation;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const followUp = await prisma.followUp.update({
    where: { id },
    data: updateData,
    include: {
      medicalRecord: {
        select: { id: true, title: true, type: true, recordDate: true },
      },
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: existing.organizationId || undefined,
    action: "UPDATE_FOLLOW_UP",
    entityType: "followUp",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(followUp);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.followUp.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.followUp.delete({ where: { id } });

  await logAudit({
    userId: auth.userId,
    organizationId: existing.organizationId || undefined,
    action: "DELETE_FOLLOW_UP",
    entityType: "followUp",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
