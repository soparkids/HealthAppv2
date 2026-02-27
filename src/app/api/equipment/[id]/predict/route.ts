import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { getConfiguredProviders, type AIProvider } from "@/lib/ai-providers";
import { triggerPredictionSchema } from "@/lib/validations/equipment";
import { encrypt } from "@/lib/encryption";
import {
  predictEquipmentFailure,
  type PredictionRequest,
  type MaintenanceHistory,
  type SensorTrend,
} from "@/lib/equipment-prediction";

/**
 * POST /api/equipment/[id]/predict
 * Trigger AI prediction for equipment failure.
 * Requires: predictive_maintenance feature
 * Roles: OWNER, ADMIN, DOCTOR
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  // Check AI providers
  const configured = getConfiguredProviders();
  if (configured.length === 0) {
    return NextResponse.json(
      {
        error: "AI prediction unavailable",
        message: "No AI providers are configured. Contact your system administrator to set up API keys.",
      },
      { status: 503 }
    );
  }

  // Parse optional body for preferred provider
  let preferredProvider: AIProvider | undefined;
  try {
    const body = await request.json();
    const parsed = triggerPredictionSchema.safeParse(body);
    if (parsed.success && parsed.data.preferredProvider) {
      preferredProvider = parsed.data.preferredProvider;
    }
  } catch {
    // No body or invalid JSON — use default provider order
  }

  // Fetch equipment with full history
  const equipment = await prisma.equipment.findFirst({
    where: { id, organizationId },
  });

  if (!equipment) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  // Fetch maintenance history (last 20 records)
  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: { equipmentId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Fetch sensor readings (last 100 per metric type)
  const sensorReadings = await prisma.sensorReading.findMany({
    where: { equipmentId: id },
    orderBy: { timestamp: "desc" },
    take: 500,
  });

  // Build maintenance history
  const maintenanceHistory: MaintenanceHistory[] = maintenanceLogs.map((log) => ({
    type: log.type,
    description: log.description,
    performedBy: log.performedBy,
    cost: log.cost ?? undefined,
    partsReplaced: log.partsReplaced ?? undefined,
    date: log.createdAt.toISOString().split("T")[0],
  }));

  // Build sensor trends grouped by metric type
  const sensorGrouped: Record<string, Array<{ value: number; timestamp: string }>> = {};
  for (const reading of sensorReadings) {
    if (!sensorGrouped[reading.metricType]) {
      sensorGrouped[reading.metricType] = [];
    }
    sensorGrouped[reading.metricType].push({
      value: reading.value,
      timestamp: reading.timestamp.toISOString(),
    });
  }

  const sensorTrends: SensorTrend[] = Object.entries(sensorGrouped).map(([metricType, readings]) => {
    const values = readings.map((r) => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Simple trend detection: compare first half average to second half average
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(midpoint); // older (since sorted desc)
    const secondHalf = values.slice(0, midpoint); // newer
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avg;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avg;
    const diff = secondHalfAvg - firstHalfAvg;
    const threshold = avg * 0.05; // 5% change threshold

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (diff > threshold) trend = "increasing";
    else if (diff < -threshold) trend = "decreasing";

    return { metricType, readings, average: avg, min, max, trend };
  });

  // Calculate equipment age
  const ageInDays = equipment.installDate
    ? Math.floor((Date.now() - equipment.installDate.getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  const predictionRequest: PredictionRequest = {
    equipment: {
      name: equipment.name,
      type: equipment.type,
      serialNumber: equipment.serialNumber,
      manufacturer: equipment.manufacturer ?? undefined,
      model: equipment.model ?? undefined,
      installDate: equipment.installDate?.toISOString().split("T")[0],
      warrantyExpiry: equipment.warrantyExpiry?.toISOString().split("T")[0],
      location: equipment.location ?? undefined,
      status: equipment.status,
      ageInDays,
    },
    maintenanceHistory,
    sensorTrends,
  };

  try {
    const result = await predictEquipmentFailure(predictionRequest, preferredProvider);

    // Create prediction alert
    const alert = await prisma.predictionAlert.create({
      data: {
        equipmentId: id,
        organizationId,
        riskScore: result.riskScore,
        predictedFailureDate: result.predictedFailureDate ? new Date(result.predictedFailureDate) : null,
        recommendedAction: encrypt(result.recommendedAction),
        urgency: result.urgency,
        status: "ACTIVE",
        aiProvider: result.provider,
        aiModel: result.model,
        tokensUsed: result.tokenUsage,
        latencyMs: result.latencyMs,
        createdById: userId,
      },
    });

    await logAudit({
      userId,
      organizationId,
      action: "PREDICT_EQUIPMENT_FAILURE",
      entityType: "prediction_alert",
      entityId: alert.id,
      details: `AI prediction for "${equipment.name}" — risk: ${result.riskScore}, urgency: ${result.urgency}, provider: ${result.provider}/${result.model}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      prediction: {
        id: alert.id,
        equipmentId: id,
        riskScore: result.riskScore,
        predictedFailureDate: result.predictedFailureDate,
        recommendedAction: result.recommendedAction,
        urgency: result.urgency,
        reasoning: result.reasoning,
        provider: result.provider,
        model: result.model,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
        createdAt: alert.createdAt,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Equipment prediction failed:", errorMsg);
    return NextResponse.json(
      {
        error: "Prediction failed",
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
