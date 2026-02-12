import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const record = await prisma.medicalRecord.findFirst({
    where: { id, userId: session.user.id },
    include: {
      report: true,
      sharedRecords: true,
      followUps: true,
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.medicalRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, type, bodyPart, facility, referringPhysician, recordDate, notes } = body;

  const record = await prisma.medicalRecord.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(type && { type }),
      ...(bodyPart !== undefined && { bodyPart }),
      ...(facility !== undefined && { facility }),
      ...(referringPhysician !== undefined && { referringPhysician }),
      ...(recordDate && { recordDate: new Date(recordDate) }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.medicalRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  await prisma.medicalRecord.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
