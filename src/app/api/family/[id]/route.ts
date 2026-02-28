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
          // Only include medical records if consent has been given
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

  // Block medical records access if consent not given
  if (!familyMember.consentGiven) {
    return NextResponse.json({
      ...familyMember,
      member: {
        ...familyMember.member,
        medicalRecords: [],
      },
      consentPending: true,
    });
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
  // consentGiven can only be changed by the member via /api/family/consent — not by the adder

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
