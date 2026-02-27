import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { decrypt } from "@/lib/encryption";

/**
 * GET /api/equipment/alerts
 * Org-wide alert dashboard: all prediction alerts across all equipment.
 */
export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const status = url.searchParams.get("status") || "";
  const urgency = url.searchParams.get("urgency") || "";

  const where: Record<string, unknown> = { organizationId };
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;

  const [alerts, total] = await Promise.all([
    prisma.predictionAlert.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
            serialNumber: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.predictionAlert.count({ where }),
  ]);

  // Get summary counts
  const [activeCount, criticalCount, highCount] = await Promise.all([
    prisma.predictionAlert.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.predictionAlert.count({ where: { organizationId, status: "ACTIVE", urgency: "CRITICAL" } }),
    prisma.predictionAlert.count({ where: { organizationId, status: "ACTIVE", urgency: "HIGH" } }),
  ]);

  const decryptedAlerts = alerts.map((alert) => ({
    ...alert,
    recommendedAction: decrypt(alert.recommendedAction),
  }));

  return NextResponse.json({
    alerts: decryptedAlerts,
    summary: {
      active: activeCount,
      critical: criticalCount,
      high: highCount,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
