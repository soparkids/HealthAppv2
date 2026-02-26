import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { decryptFields, SENSITIVE_LAB_RESULT_FIELDS, SENSITIVE_PATIENT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  // Allow reading existing lab results even if feature is disabled

  const result = await prisma.labResult.findFirst({
    where: { id, organizationId },
    include: { patient: true },
  });

  if (!result) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  const decrypted = decryptFields(result, [...SENSITIVE_LAB_RESULT_FIELDS]);

  // Parse recommendations from encrypted JSON string into an array
  let recommendations: string[] | null = null;
  if (typeof decrypted.recommendations === "string" && decrypted.recommendations) {
    try {
      recommendations = JSON.parse(decrypted.recommendations);
    } catch {
      recommendations = [decrypted.recommendations];
    }
  }

  // Decrypt patient fields separately, handling missing patient gracefully
  const decryptedPatient = result.patient
    ? decryptFields(result.patient, [...SENSITIVE_PATIENT_FIELDS])
    : null;

  // Build response excluding raw nested relations from spread, then add them back explicitly
  const { patient: _rawPatient, interpretations: _rawInterps, ...labResultFields } = decrypted as Record<string, unknown>;

  return NextResponse.json({
    ...labResultFields,
    recommendations,
    patient: decryptedPatient,
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const existing = await prisma.labResult.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  await prisma.labResult.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_LAB_RESULT",
    entityType: "lab_result",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
