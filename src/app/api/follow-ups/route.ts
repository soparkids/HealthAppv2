import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const followUps = await prisma.followUp.findMany({
    where: { userId: session.user.id },
    include: {
      medicalRecord: {
        select: { id: true, title: true, type: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(followUps);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { recommendation, medicalRecordId, dueDate, notes } = body;

  if (!recommendation) {
    return NextResponse.json(
      { error: "Recommendation is required" },
      { status: 400 }
    );
  }

  const followUp = await prisma.followUp.create({
    data: {
      userId: session.user.id,
      recommendation,
      medicalRecordId: medicalRecordId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
    },
    include: {
      medicalRecord: {
        select: { id: true, title: true, type: true },
      },
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
