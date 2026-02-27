import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { updateAlertStatusSchema } from "@/lib/validations/equipment";
import { decrypt } from "@/lib/encryption";

/**
 * GET /api/equipment/[id]/alerts
 * Get alerts for a specific piece of equipment.
 */
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
  const status = url.searchParams.get("status") || "";

  const where: Record<string, unknown> = { equipmentId: id, organizationId };
  if (status) where.status = status;

  const [alerts, total] = await Promise.all([
    prisma.predictionAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.predictionAlert.count({ where }),
  ]);

  const decryptedAlerts = alerts.map((alert) => ({
    ...alert,
    recommendedAction: decrypt(alert.recommendedAction),
  }));

  return NextResponse.json({
    alerts: decryptedAlerts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * PUT /api/equipment/[id]/alerts
 * Update alert status (acknowledge, resolve, dismiss).
 * Body: { alertId: string, status: "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" }
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const body = await request.json();
  const { alertId, ...statusBody } = body;

  if (!alertId) {
    return NextResponse.json({ error: "alertId is required" }, { status: 400 });
  }

  const parsed = updateAlertStatusSchema.safeParse(statusBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify alert belongs to this equipment and org
  const alert = await prisma.predictionAlert.findFirst({
    where: { id: alertId, equipmentId: id, organizationId },
  });

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === "RESOLVED") {
    updateData.resolvedAt = new Date();
    updateData.resolvedById = userId;
  }

  const updated = await prisma.predictionAlert.update({
    where: { id: alertId },
    data: updateData,
  });

  const actionMap: Record<string, string> = {
    ACKNOWLEDGED: "ACKNOWLEDGE_ALERT",
    RESOLVED: "RESOLVE_ALERT",
    DISMISSED: "DISMISS_ALERT",
  };

  await logAudit({
    userId,
    organizationId,
    action: actionMap[parsed.data.status] as "ACKNOWLEDGE_ALERT" | "RESOLVE_ALERT" | "DISMISS_ALERT",
    entityType: "prediction_alert",
    entityId: alertId,
    details: `${parsed.data.status} alert for equipment (ID: ${id})`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    alert: {
      ...updated,
      recommendedAction: decrypt(updated.recommendedAction),
    },
  });
}
