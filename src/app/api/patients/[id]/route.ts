import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { updatePatientSchema } from "@/lib/validations/clinical";
import { encryptFields, decryptFields, SENSITIVE_PATIENT_FIELDS, SENSITIVE_LAB_RESULT_FIELDS, SENSITIVE_MEDICAL_HISTORY_FIELDS, SENSITIVE_EYE_CONSULTATION_FIELDS } from "@/lib/encryption";

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

  // Decrypt sensitive fields on patient and nested clinical data
  const decryptedPatient = {
    ...decryptFields(patient, [...SENSITIVE_PATIENT_FIELDS]),
    appointments: patient.appointments,
    labResults: patient.labResults.map((r) => decryptFields(r, [...SENSITIVE_LAB_RESULT_FIELDS])),
    medicalHistories: patient.medicalHistories.map((h) => decryptFields(h, [...SENSITIVE_MEDICAL_HISTORY_FIELDS])),
    eyeConsultations: patient.eyeConsultations.map((c) => decryptFields(c, [...SENSITIVE_EYE_CONSULTATION_FIELDS])),
  };

  return NextResponse.json({ patient: decryptedPatient });
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

  // Encrypt sensitive fields in update data
  const updateData: Record<string, unknown> = encryptFields(
    { ...parsed.data },
    [...SENSITIVE_PATIENT_FIELDS]
  );
  if (parsed.data.dateOfBirth) {
    updateData.dateOfBirth = new Date(parsed.data.dateOfBirth);
  }

  // Check if medical fields changed — if so, append history
  // Compare against plaintext inputs (existing data is encrypted)
  const medicalChanged =
    parsed.data.medicalConditions !== undefined ||
    parsed.data.medications !== undefined ||
    parsed.data.notes !== undefined;

  const patient = await prisma.patient.update({
    where: { id },
    data: updateData,
  });

  if (medicalChanged) {
    await prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: id,
        medicalConditions: patient.medicalConditions, // already encrypted from update
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

  return NextResponse.json({ patient: decryptFields(patient, [...SENSITIVE_PATIENT_FIELDS]) });
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
