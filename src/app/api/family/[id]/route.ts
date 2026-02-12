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

  const familyMember = await prisma.familyMember.findFirst({
    where: { id, userId: session.user.id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          medicalRecords: {
            select: {
              id: true,
              title: true,
              type: true,
              recordDate: true,
              bodyPart: true,
            },
            orderBy: { recordDate: "desc" },
          },
        },
      },
    },
  });

  if (!familyMember) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(familyMember);
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

  const existing = await prisma.familyMember.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.relationship !== undefined) updateData.relationship = body.relationship;
  if (body.consentGiven !== undefined) updateData.consentGiven = body.consentGiven;

  const familyMember = await prisma.familyMember.update({
    where: { id },
    data: updateData,
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          medicalRecords: {
            select: {
              id: true,
              title: true,
              type: true,
              recordDate: true,
              bodyPart: true,
            },
            orderBy: { recordDate: "desc" },
          },
        },
      },
    },
  });

  return NextResponse.json(familyMember);
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

  const existing = await prisma.familyMember.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.familyMember.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
