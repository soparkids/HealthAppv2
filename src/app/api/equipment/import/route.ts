import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { importEquipmentRowSchema } from "@/lib/validations/equipment";
import { encrypt } from "@/lib/encryption";

interface ImportRow {
  name: string;
  type: string;
  serialNumber: string;
  manufacturer?: string;
  model?: string;
  installDate?: string;
  warrantyExpiry?: string;
  location?: string;
  notes?: string;
}

interface ImportError {
  row: number;
  errors: string[];
}

/**
 * POST /api/equipment/import
 * Bulk import equipment from parsed CSV data (JSON array).
 * Roles: OWNER, ADMIN
 */
export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "predictive_maintenance");
  if (featureGate) return featureGate;

  const body = await request.json();
  const { rows } = body as { rows: ImportRow[] };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "No rows provided. Send { rows: [...] } with at least one equipment entry." },
      { status: 400 }
    );
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 rows per import" },
      { status: 400 }
    );
  }

  // Validate all rows
  const validRows: Array<{
    name: string;
    type: string;
    serialNumber: string;
    manufacturer?: string;
    model?: string;
    installDate?: string;
    warrantyExpiry?: string;
    location?: string;
    notes?: string;
  }> = [];
  const importErrors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = importEquipmentRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const fieldErrors = Object.entries(flattened.fieldErrors).map(
        ([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`
      );
      const formErrors = flattened.formErrors as string[];
      importErrors.push({
        row: i + 1,
        errors: [...formErrors, ...fieldErrors],
      });
    } else {
      validRows.push(parsed.data);
    }
  }

  if (importErrors.length > 0 && validRows.length === 0) {
    return NextResponse.json(
      { error: "All rows failed validation", details: importErrors },
      { status: 400 }
    );
  }

  // Check for duplicate serial numbers within the import batch
  const serialNumbers = validRows.map((r) => r.serialNumber);
  const uniqueSerials = new Set(serialNumbers);
  if (uniqueSerials.size !== serialNumbers.length) {
    return NextResponse.json(
      { error: "Duplicate serial numbers found in import data" },
      { status: 400 }
    );
  }

  // Check for existing serial numbers in the org
  const existingEquipment = await prisma.equipment.findMany({
    where: {
      organizationId,
      serialNumber: { in: serialNumbers },
    },
    select: { serialNumber: true },
  });

  const existingSerials = new Set(existingEquipment.map((e) => e.serialNumber));
  const newRows = validRows.filter((r) => !existingSerials.has(r.serialNumber));
  const skippedSerials = validRows.filter((r) => existingSerials.has(r.serialNumber));

  if (newRows.length === 0) {
    return NextResponse.json(
      {
        error: "All equipment already exists in this organization",
        skipped: skippedSerials.map((r) => r.serialNumber),
      },
      { status: 409 }
    );
  }

  // Create equipment records
  const created = await prisma.equipment.createMany({
    data: newRows.map((row) => ({
      organizationId,
      name: row.name,
      type: row.type as "MRI" | "XRAY" | "CT_SCANNER" | "ULTRASOUND" | "VENTILATOR" | "PATIENT_MONITOR" | "INFUSION_PUMP" | "DEFIBRILLATOR" | "OTHER",
      serialNumber: row.serialNumber,
      manufacturer: row.manufacturer,
      model: row.model,
      installDate: row.installDate ? new Date(row.installDate) : undefined,
      warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : undefined,
      location: row.location,
      notes: row.notes ? encrypt(row.notes) : undefined,
      status: "ACTIVE" as const,
      createdById: userId,
    })),
  });

  await logAudit({
    userId,
    organizationId,
    action: "IMPORT_EQUIPMENT",
    entityType: "equipment",
    details: `Imported ${created.count} equipment items (${skippedSerials.length} skipped as duplicates, ${importErrors.length} validation errors)`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      imported: created.count,
      skipped: skippedSerials.map((r) => r.serialNumber),
      errors: importErrors,
      total: rows.length,
    },
    { status: 201 }
  );
}
