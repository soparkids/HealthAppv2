import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { updatePatientSchema } from "@/lib/validations/clinical";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, organizationId },
    include: {
      appointments: { orderBy: { appointmentDate: "desc" }, take: 5 },
      labResults: { orderBy: { datePerformed: "desc" }, take: 5 },
      medicalHistories: { orderBy: { createdAt: "desc" }, take: 5 },
      eyeConsultations: { orderBy: { consultationDate: "desc" }, take: 5 },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const existing = await prisma.patient.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dateOfBirth) {
    updateData.dateOfBirth = new Date(parsed.data.dateOfBirth);
  }

  // Check if medical fields changed — if so, append history
  const medicalChanged =
    (parsed.data.medicalConditions !== undefined && parsed.data.medicalConditions !== existing.medicalConditions) ||
    (parsed.data.medications !== undefined && parsed.data.medications !== existing.medications) ||
    (parsed.data.notes !== undefined && parsed.data.notes !== existing.notes);

  const patient = await prisma.patient.update({
    where: { id },
    data: updateData,
  });

  if (medicalChanged) {
    await prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: id,
        medicalConditions: patient.medicalConditions,
        medications: patient.medications,
        notes: patient.notes,
      },
    });
  }

  await logAudit({
    userId,
    organizationId,
    action: "UPDATE_PATIENT",
    entityType: "patient",
    entityId: id,
    details: `Updated patient ${existing.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ patient });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const existing = await prisma.patient.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  await prisma.patient.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_PATIENT",
    entityType: "patient",
    entityId: id,
    details: `Deleted patient ${existing.patientNumber}: ${existing.firstName} ${existing.lastName}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
