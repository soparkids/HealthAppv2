import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const where: Record<string, unknown> = { userId: session.user.id };

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
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, type, bodyPart, facility, referringPhysician, recordDate, notes, fileUrl, fileType, fileSize } = body;

  if (!title || !recordDate) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    );
  }

  const record = await prisma.medicalRecord.create({
    data: {
      userId: session.user.id,
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

  return NextResponse.json(record, { status: 201 });
}
