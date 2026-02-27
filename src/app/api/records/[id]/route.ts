import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { decryptFields, SENSITIVE_REPORT_FIELDS } from "@/lib/encryption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const record = await prisma.medicalRecord.findFirst({
    where: { id, userId: auth.userId },
    include: {
      report: true,
      sharedRecords: true,
      followUps: true,
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Decrypt sensitive report fields if a report is attached
  const result = record.report
    ? { ...record, report: decryptFields(record.report, [...SENSITIVE_REPORT_FIELDS]) }
    : record;

  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.medicalRecord.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, type, bodyPart, facility, referringPhysician, recordDate, notes } = body;

  const record = await prisma.medicalRecord.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(type && { type }),
      ...(bodyPart !== undefined && { bodyPart }),
      ...(facility !== undefined && { facility }),
      ...(referringPhysician !== undefined && { referringPhysician }),
      ...(recordDate && { recordDate: new Date(recordDate) }),
      ...(notes !== undefined && { notes }),
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: existing.organizationId || undefined,
    action: "UPDATE_RECORD",
    entityType: "medicalRecord",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(record);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.medicalRecord.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  await prisma.medicalRecord.delete({ where: { id } });

  await logAudit({
    userId: auth.userId,
    organizationId: existing.organizationId || undefined,
    action: "DELETE_RECORD",
    entityType: "medicalRecord",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
