import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { requireFeature } from "@/lib/features";

export async function GET(request: NextRequest) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const orgId = request.headers.get("x-organization-id");
  if (orgId) {
    const featureCheck = await requireFeature(orgId, "follow_ups");
    if (featureCheck) return featureCheck;
  }

  const followUps = await prisma.followUp.findMany({
    where: { userId: auth.userId },
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
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const organizationId = request.headers.get("x-organization-id");
  if (organizationId) {
    const featureCheck = await requireFeature(organizationId, "follow_ups");
    if (featureCheck) return featureCheck;
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
      userId: auth.userId,
      organizationId: organizationId || undefined,
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

  await logAudit({
    userId: auth.userId,
    organizationId: organizationId || undefined,
    action: "CREATE_FOLLOW_UP",
    entityType: "followUp",
    entityId: followUp.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(followUp, { status: 201 });
}
