import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, withAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function GET(request: NextRequest) {
  // Try org auth first (provider context), fall back to user auth (patient self-access)
  const orgAuth = await withOrgAuth(request);
  const isOrgContext = !(orgAuth instanceof NextResponse);

  if (!isOrgContext) {
    // Fall back to patient self-access
    const auth = await withAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Record<string, unknown> = { userId: auth.userId };

    if (type && type !== "All") {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { facility: { contains: search, mode: "insensitive" } },
        { referringPhysician: { contains: search, mode: "insensitive" } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        orderBy: { recordDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { report: true },
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  // Org context — scope to organization
  const { organizationId } = orgAuth as OrgAuthContext;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const where: Record<string, unknown> = { organizationId };

  if (type && type !== "All") {
    where.type = type;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { facility: { contains: search, mode: "insensitive" } },
      { referringPhysician: { contains: search, mode: "insensitive" } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where,
      orderBy: { recordDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { report: true },
    }),
    prisma.medicalRecord.count({ where }),
  ]);

  return NextResponse.json({
    records,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, type, bodyPart, facility, referringPhysician, recordDate, notes, fileUrl, fileType, fileSize } = body;

  if (!title || !recordDate) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    );
  }

  const organizationId = request.headers.get("x-organization-id");

  // If org context provided, verify membership
  if (organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId,
        },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }
  }

  const record = await prisma.medicalRecord.create({
    data: {
      userId: auth.userId,
      organizationId: organizationId || undefined,
      title,
      type: type || "OTHER",
      bodyPart,
      facility,
      referringPhysician,
      recordDate: new Date(recordDate),
      notes,
      fileUrl,
      fileType,
      fileSize,
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: organizationId || undefined,
    action: "CREATE_RECORD",
    entityType: "medicalRecord",
    entityId: record.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(record, { status: 201 });
}
