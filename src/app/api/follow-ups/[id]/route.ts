import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const followUp = await prisma.followUp.findFirst({
    where: { id, userId: session.user.id },
    include: {
      medicalRecord: {
        select: { id: true, title: true, type: true, recordDate: true },
      },
    },
  });

  if (!followUp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(followUp);
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

  const existing = await prisma.followUp.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.status) updateData.status = body.status;
  if (body.recommendation) updateData.recommendation = body.recommendation;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const followUp = await prisma.followUp.update({
    where: { id },
    data: updateData,
    include: {
      medicalRecord: {
        select: { id: true, title: true, type: true, recordDate: true },
      },
    },
  });

  return NextResponse.json(followUp);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.followUp.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.followUp.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
