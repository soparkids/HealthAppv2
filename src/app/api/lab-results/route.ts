import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createLabResultSchema } from "@/lib/validations/clinical";
import { encrypt, decryptFields, SENSITIVE_LAB_RESULT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const patientId = url.searchParams.get("patientId");

  const where: Record<string, unknown> = { organizationId };
  if (patientId) where.patientId = patientId;

  const [results, total] = await Promise.all([
    prisma.labResult.findMany({
      where,
      include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
      orderBy: { datePerformed: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.labResult.count({ where }),
  ]);

  const decryptedResults = results.map((r) => decryptFields(r, [...SENSITIVE_LAB_RESULT_FIELDS]));

  return NextResponse.json({
    results: decryptedResults,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createLabResultSchema.safeParse(body);
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

  const result = await prisma.labResult.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId,
      testName: parsed.data.testName,
      resultValue: encrypt(parsed.data.resultValue),
      unit: parsed.data.unit || undefined,
      referenceRange: parsed.data.referenceRange || undefined,
      datePerformed: new Date(parsed.data.datePerformed),
      notes: parsed.data.notes ? encrypt(parsed.data.notes) : undefined,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_LAB_RESULT",
    entityType: "lab_result",
    entityId: result.id,
    details: `Added lab result "${parsed.data.testName}" for patient ${patient.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ result: decryptFields(result, [...SENSITIVE_LAB_RESULT_FIELDS]) }, { status: 201 });
}
