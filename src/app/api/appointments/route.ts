import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createAppointmentSchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  // Allow reading existing appointments even if feature is disabled
  // Only block creation (POST) when feature is off

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const patientId = url.searchParams.get("patientId");
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = { organizationId };
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({
    appointments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createAppointmentSchema.safeParse(body);
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

  const appointment = await prisma.appointment.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId,
      appointmentDate: new Date(parsed.data.appointmentDate),
      appointmentTime: parsed.data.appointmentTime,
      doctor: parsed.data.doctor,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_APPOINTMENT",
    entityType: "appointment",
    entityId: appointment.id,
    details: `Created appointment for patient ${patient.patientNumber} on ${parsed.data.appointmentDate}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
