import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recordId = request.nextUrl.searchParams.get("recordId");

  const where: Record<string, unknown> = { sharedByUserId: session.user.id };
  if (recordId) where.medicalRecordId = recordId;

  const shares = await prisma.sharedRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(shares);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { medicalRecordId, sharedWithEmail, permission, expiresAt } = body;

  if (!medicalRecordId || !sharedWithEmail) {
    return NextResponse.json(
      { error: "Medical record ID and email are required" },
      { status: 400 }
    );
  }

  const record = await prisma.medicalRecord.findFirst({
    where: { id: medicalRecordId, userId: session.user.id },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const share = await prisma.sharedRecord.create({
    data: {
      medicalRecordId,
      sharedByUserId: session.user.id,
      sharedWithEmail,
      permission: permission || "VIEW",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(share, { status: 201 });
}
