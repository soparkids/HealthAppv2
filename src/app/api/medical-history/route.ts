import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createMedicalHistorySchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "medical_history");
  if (featureGate) return featureGate;

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

  return NextResponse.json({
    entries,
    currentPatient: {
      medicalConditions: patient.medicalConditions,
      medications: patient.medications,
      notes: patient.notes,
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

  // Dual-write: append to history AND update patient's current fields
  const [entry] = await prisma.$transaction([
    prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: parsed.data.patientId,
        medicalConditions: parsed.data.medicalConditions,
        medications: parsed.data.medications,
        notes: parsed.data.notes,
      },
    }),
    prisma.patient.update({
      where: { id: parsed.data.patientId },
      data: {
        medicalConditions: parsed.data.medicalConditions ?? patient.medicalConditions,
        medications: parsed.data.medications ?? patient.medications,
        notes: parsed.data.notes ?? patient.notes,
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

  return NextResponse.json({ entry }, { status: 201 });
}
