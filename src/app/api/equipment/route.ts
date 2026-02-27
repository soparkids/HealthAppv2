import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createEquipmentSchema } from "@/lib/validations/equipment";
import { encryptFields, decryptFields, SENSITIVE_EQUIPMENT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const search = url.searchParams.get("search") || "";
  const type = url.searchParams.get("type") || "";
  const status = url.searchParams.get("status") || "";
  const location = url.searchParams.get("location") || "";

  const where: Record<string, unknown> = { organizationId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
      { manufacturer: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
    ];
  }

  if (type) where.type = type;
  if (status) where.status = status;
  if (location) where.location = { contains: location, mode: "insensitive" };

  const [equipment, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.equipment.count({ where }),
  ]);

  const decryptedEquipment = equipment.map((e) =>
    decryptFields(e, [...SENSITIVE_EQUIPMENT_FIELDS])
  );

  return NextResponse.json({
    equipment: decryptedEquipment,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createEquipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Check for duplicate serial number in org
  const existing = await prisma.equipment.findFirst({
    where: { organizationId, serialNumber: parsed.data.serialNumber },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Equipment with this serial number already exists in this organization" },
      { status: 409 }
    );
  }

  const encryptedData = encryptFields(
    { notes: parsed.data.notes },
    [...SENSITIVE_EQUIPMENT_FIELDS]
  );

  const equipment = await prisma.equipment.create({
    data: {
      organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
      serialNumber: parsed.data.serialNumber,
      manufacturer: parsed.data.manufacturer,
      model: parsed.data.model,
      installDate: parsed.data.installDate ? new Date(parsed.data.installDate) : undefined,
      warrantyExpiry: parsed.data.warrantyExpiry ? new Date(parsed.data.warrantyExpiry) : undefined,
      location: parsed.data.location,
      status: parsed.data.status || "ACTIVE",
      notes: encryptedData.notes,
      createdById: userId,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_EQUIPMENT",
    entityType: "equipment",
    entityId: equipment.id,
    details: `Registered equipment "${parsed.data.name}" (S/N: ${parsed.data.serialNumber})`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    { equipment: decryptFields(equipment, [...SENSITIVE_EQUIPMENT_FIELDS]) },
    { status: 201 }
  );
}
