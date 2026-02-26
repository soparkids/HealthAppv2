import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createMedicalHistorySchema } from "@/lib/validations/clinical";
import { encrypt, decryptFields, SENSITIVE_MEDICAL_HISTORY_FIELDS, SENSITIVE_PATIENT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  // Allow reading existing history even if feature is disabled (only block writes)

  const url = new URL(request.url);
  const patientId = url.searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "patientId query parameter is required" }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  const entries = await prisma.medicalHistory.findMany({
    where: { patientId, organizationId },
    orderBy: { createdAt: "desc" },
  });

  const decryptedEntries = entries.map((e) => decryptFields(e, [...SENSITIVE_MEDICAL_HISTORY_FIELDS]));
  const decryptedPatient = decryptFields(patient, [...SENSITIVE_PATIENT_FIELDS]);

  return NextResponse.json({
    entries: decryptedEntries,
    currentPatient: {
      medicalConditions: decryptedPatient.medicalConditions,
      medications: decryptedPatient.medications,
      notes: decryptedPatient.notes,
    },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "medical_history");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createMedicalHistorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  // Encrypt sensitive fields before storage
  const encMedConditions = parsed.data.medicalConditions ? encrypt(parsed.data.medicalConditions) : undefined;
  const encMedications = parsed.data.medications ? encrypt(parsed.data.medications) : undefined;
  const encNotes = parsed.data.notes ? encrypt(parsed.data.notes) : undefined;

  // Dual-write: append to history AND update patient's current fields
  const [entry] = await prisma.$transaction([
    prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: parsed.data.patientId,
        medicalConditions: encMedConditions,
        medications: encMedications,
        notes: encNotes,
      },
    }),
    prisma.patient.update({
      where: { id: parsed.data.patientId },
      data: {
        medicalConditions: encMedConditions ?? patient.medicalConditions,
        medications: encMedications ?? patient.medications,
        notes: encNotes ?? patient.notes,
      },
    }),
  ]);

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_MEDICAL_HISTORY",
    entityType: "medical_history",
    entityId: entry.id,
    details: `Appended medical history for patient ${patient.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ entry: decryptFields(entry, [...SENSITIVE_MEDICAL_HISTORY_FIELDS]) }, { status: 201 });
}
