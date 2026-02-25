import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { createPatientSchema } from "@/lib/validations/clinical";
import { encryptFields, decryptFields, SENSITIVE_PATIENT_FIELDS } from "@/lib/encryption";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const search = url.searchParams.get("search") || "";

  const where: Record<string, unknown> = { organizationId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { patientNumber: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  const decryptedPatients = patients.map((p) =>
    decryptFields(p, [...SENSITIVE_PATIENT_FIELDS])
  );

  return NextResponse.json({
    patients: decryptedPatients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Get the org's patient number prefix
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { patientNumberPrefix: true },
  });
  const prefix = org?.patientNumberPrefix || "P";

  // Generate next patient number using the org's prefix
  const lastPatient = await prisma.patient.findFirst({
    where: { organizationId },
    orderBy: { patientNumber: "desc" },
    select: { patientNumber: true },
  });

  let nextNum = 1;
  if (lastPatient) {
    const match = lastPatient.patientNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const patientNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

  // Encrypt sensitive fields before storage
  const encryptedData = encryptFields(
    {
      emergencyContact: parsed.data.emergencyContact,
      emergencyPhone: parsed.data.emergencyPhone,
      allergies: parsed.data.allergies,
      medicalConditions: parsed.data.medicalConditions,
      medications: parsed.data.medications,
      notes: parsed.data.notes,
    },
    [...SENSITIVE_PATIENT_FIELDS]
  );

  const patient = await prisma.patient.create({
    data: {
      organizationId,
      patientNumber,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      gender: parsed.data.gender,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      ...encryptedData,
    },
  });

  // If patient has medical info, create initial medical history entry (already encrypted)
  if (parsed.data.medicalConditions || parsed.data.medications || parsed.data.notes) {
    await prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: patient.id,
        medicalConditions: encryptedData.medicalConditions,
        medications: encryptedData.medications,
        notes: encryptedData.notes,
      },
    });
  }

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_PATIENT",
    entityType: "patient",
    entityId: patient.id,
    details: `Created patient ${patientNumber}: ${parsed.data.firstName} ${parsed.data.lastName}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ patient: decryptFields(patient, [...SENSITIVE_PATIENT_FIELDS]) }, { status: 201 });
}
