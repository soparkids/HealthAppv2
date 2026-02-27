import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createSensorReadingSchema, batchSensorReadingsSchema } from "@/lib/validations/equipment";

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
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
  const metricType = url.searchParams.get("metricType") || "";

  const where: Record<string, unknown> = { equipmentId: id, organizationId };
  if (metricType) where.metricType = metricType;

  const [readings, total] = await Promise.all([
    prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sensorReading.count({ where }),
  ]);

  return NextResponse.json({
    readings,
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

  // Support both single reading and batch readings
  if (body.readings) {
    // Batch mode
    const parsed = batchSensorReadingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await prisma.sensorReading.createMany({
      data: parsed.data.readings.map((reading) => ({
        equipmentId: id,
        organizationId,
        metricType: reading.metricType,
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
      })),
    });

    await logAudit({
      userId,
      organizationId,
      action: "CREATE_SENSOR_READING",
      entityType: "sensor_reading",
      details: `Added ${result.count} sensor readings for "${equipment.name}" (S/N: ${equipment.serialNumber})`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ count: result.count }, { status: 201 });
  } else {
    // Single reading mode
    const parsed = createSensorReadingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const reading = await prisma.sensorReading.create({
      data: {
        equipmentId: id,
        organizationId,
        metricType: parsed.data.metricType,
        value: parsed.data.value,
        unit: parsed.data.unit,
        timestamp: parsed.data.timestamp ? new Date(parsed.data.timestamp) : new Date(),
      },
    });

    await logAudit({
      userId,
      organizationId,
      action: "CREATE_SENSOR_READING",
      entityType: "sensor_reading",
      entityId: reading.id,
      details: `Added ${parsed.data.metricType} reading (${parsed.data.value}) for "${equipment.name}"`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ reading }, { status: 201 });
  }
}
