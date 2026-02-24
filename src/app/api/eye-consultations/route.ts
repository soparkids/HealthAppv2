import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createEyeConsultationSchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const patientId = url.searchParams.get("patientId");

  const where: Record<string, unknown> = { organizationId };
  if (patientId) where.patientId = patientId;

  const [consultations, total] = await Promise.all([
    prisma.eyeConsultation.findMany({
      where,
      include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
      orderBy: { consultationDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.eyeConsultation.count({ where }),
  ]);

  return NextResponse.json({
    consultations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createEyeConsultationSchema.safeParse(body);
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

  const consultation = await prisma.eyeConsultation.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId,
      consultationDate: new Date(parsed.data.consultationDate),
      doctor: parsed.data.doctor,
      chiefComplaint: parsed.data.chiefComplaint,
      reMovement: parsed.data.reMovement,
      leMovement: parsed.data.leMovement,
      reLids: parsed.data.reLids,
      leLids: parsed.data.leLids,
      reGlobe: parsed.data.reGlobe,
      leGlobe: parsed.data.leGlobe,
      reConjunctiva: parsed.data.reConjunctiva,
      leConjunctiva: parsed.data.leConjunctiva,
      reCornea: parsed.data.reCornea,
      leCornea: parsed.data.leCornea,
      reAc: parsed.data.reAc,
      leAc: parsed.data.leAc,
      rePupil: parsed.data.rePupil,
      lePupil: parsed.data.lePupil,
      reIris: parsed.data.reIris,
      leIris: parsed.data.leIris,
      reLens: parsed.data.reLens,
      leLens: parsed.data.leLens,
      reVrr: parsed.data.reVrr,
      leVrr: parsed.data.leVrr,
      reVcdr: parsed.data.reVcdr,
      leVcdr: parsed.data.leVcdr,
      reOthers: parsed.data.reOthers,
      leOthers: parsed.data.leOthers,
      diagnosis: parsed.data.diagnosis,
      plan: parsed.data.plan,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_EYE_CONSULTATION",
    entityType: "eye_consultation",
    entityId: consultation.id,
    details: `Created eye consultation for patient ${patient.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ consultation }, { status: 201 });
}
