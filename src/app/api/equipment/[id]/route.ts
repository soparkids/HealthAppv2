import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { updateEquipmentSchema } from "@/lib/validations/equipment";
import { encryptFields, decryptFields, SENSITIVE_EQUIPMENT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const equipment = await prisma.equipment.findFirst({
    where: { id, organizationId },
    include: {
      maintenanceLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      sensorReadings: { orderBy: { timestamp: "desc" }, take: 50 },
      predictionAlerts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!equipment) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  return NextResponse.json({
    equipment: decryptFields(equipment, [...SENSITIVE_EQUIPMENT_FIELDS]),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const existing = await prisma.equipment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateEquipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // If serial number is being changed, check for duplicates
  if (parsed.data.serialNumber && parsed.data.serialNumber !== existing.serialNumber) {
    const duplicate = await prisma.equipment.findFirst({
      where: { organizationId, serialNumber: parsed.data.serialNumber, NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Equipment with this serial number already exists in this organization" },
        { status: 409 }
      );
    }
  }

  const updateData: Record<string, unknown> = encryptFields(
    { ...parsed.data },
    [...SENSITIVE_EQUIPMENT_FIELDS]
  );
  if (parsed.data.installDate) {
    updateData.installDate = new Date(parsed.data.installDate);
  }
  if (parsed.data.warrantyExpiry) {
    updateData.warrantyExpiry = new Date(parsed.data.warrantyExpiry);
  }

  const equipment = await prisma.equipment.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId,
    organizationId,
    action: "UPDATE_EQUIPMENT",
    entityType: "equipment",
    entityId: id,
    details: `Updated equipment "${existing.name}" (S/N: ${existing.serialNumber})`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ equipment: decryptFields(equipment, [...SENSITIVE_EQUIPMENT_FIELDS]) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const existing = await prisma.equipment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  // Soft-delete: set status to DECOMMISSIONED instead of hard delete
  await prisma.equipment.update({
    where: { id },
    data: { status: "DECOMMISSIONED" },
  });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_EQUIPMENT",
    entityType: "equipment",
    entityId: id,
    details: `Decommissioned equipment "${existing.name}" (S/N: ${existing.serialNumber})`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
