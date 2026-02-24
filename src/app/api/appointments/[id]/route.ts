import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { updateAppointmentStatusSchema } from "@/lib/validations/clinical";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: { patient: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const existing = await prisma.appointment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateAppointmentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? existing.notes,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "UPDATE_APPOINTMENT",
    entityType: "appointment",
    entityId: id,
    details: `Updated appointment status to ${parsed.data.status}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ appointment });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const existing = await prisma.appointment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_APPOINTMENT",
    entityType: "appointment",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
