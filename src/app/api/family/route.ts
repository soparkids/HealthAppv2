import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyMembers = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    include: {
      member: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(familyMembers);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, relationship } = body;

  if (!email || !relationship) {
    return NextResponse.json(
      { error: "Email and relationship are required" },
      { status: 400 }
    );
  }

  const memberUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!memberUser) {
    return NextResponse.json(
      { error: "No user found with this email address" },
      { status: 404 }
    );
  }

  if (memberUser.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot add yourself as a family member" },
      { status: 400 }
    );
  }

  const existing = await prisma.familyMember.findUnique({
    where: {
      userId_memberUserId: {
        userId: session.user.id,
        memberUserId: memberUser.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This person is already a family member" },
      { status: 409 }
    );
  }

  const familyMember = await prisma.familyMember.create({
    data: {
      userId: session.user.id,
      memberUserId: memberUser.id,
      relationship,
    },
    include: {
      member: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  return NextResponse.json(familyMember, { status: 201 });
}
