import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createMaintenanceLogSchema } from "@/lib/validations/equipment";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  // Verify equipment belongs to org
  const equipment = await prisma.equipment.findFirst({
    where: { id, organizationId },
  });
  if (!equipment) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

  const where = { equipmentId: id, organizationId };

  const [logs, total] = await Promise.all([
    prisma.maintenanceLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.maintenanceLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  // Verify equipment belongs to org
  const equipment = await prisma.equipment.findFirst({
    where: { id, organizationId },
  });
  if (!equipment) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createMaintenanceLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const log = await prisma.maintenanceLog.create({
    data: {
      equipmentId: id,
      organizationId,
      type: parsed.data.type,
      description: parsed.data.description,
      performedBy: parsed.data.performedBy,
      cost: parsed.data.cost,
      partsReplaced: parsed.data.partsReplaced,
      nextScheduledDate: parsed.data.nextScheduledDate ? new Date(parsed.data.nextScheduledDate) : undefined,
      createdById: userId,
    },
  });

  // If maintenance type is corrective or part_replacement, update equipment status
  if (parsed.data.type === "CORRECTIVE" || parsed.data.type === "PART_REPLACEMENT") {
    await prisma.equipment.update({
      where: { id },
      data: { status: "UNDER_MAINTENANCE" },
    });
  }

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_MAINTENANCE_LOG",
    entityType: "maintenance_log",
    entityId: log.id,
    details: `Added ${parsed.data.type} maintenance for "${equipment.name}" (S/N: ${equipment.serialNumber})`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ log }, { status: 201 });
}
