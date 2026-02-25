import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { decryptFields, SENSITIVE_EYE_CONSULTATION_FIELDS, SENSITIVE_PATIENT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const consultation = await prisma.eyeConsultation.findFirst({
    where: { id, organizationId },
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "Eye consultation not found" }, { status: 404 });
  }

  const decryptedConsultation = {
    ...decryptFields(consultation, [...SENSITIVE_EYE_CONSULTATION_FIELDS]),
    patient: decryptFields(consultation.patient, [...SENSITIVE_PATIENT_FIELDS]),
  };

  return NextResponse.json({ consultation: decryptedConsultation });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const existing = await prisma.eyeConsultation.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Eye consultation not found" }, { status: 404 });
  }

  await prisma.eyeConsultation.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_EYE_CONSULTATION",
    entityType: "eye_consultation",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
