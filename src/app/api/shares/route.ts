import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { requireFeature } from "@/lib/features";

export async function GET(request: NextRequest) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  // Allow reading existing shares even if feature is disabled (only block writes)

  const recordId = request.nextUrl.searchParams.get("recordId");

  const where: Record<string, unknown> = { sharedByUserId: auth.userId };
  if (recordId) where.medicalRecordId = recordId;

  const shares = await prisma.sharedRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(shares);
}

export async function POST(request: NextRequest) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const orgId = request.headers.get("x-organization-id");
  if (orgId) {
    const featureCheck = await requireFeature(orgId, "report_sharing");
    if (featureCheck) return featureCheck;
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
    where: { id: medicalRecordId, userId: auth.userId },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const share = await prisma.sharedRecord.create({
    data: {
      medicalRecordId,
      sharedByUserId: auth.userId,
      sharedWithEmail,
      permission: permission || "VIEW",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: record.organizationId || undefined,
    action: "SHARE_RECORD",
    entityType: "sharedRecord",
    entityId: share.id,
    details: `Shared with ${sharedWithEmail}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(share, { status: 201 });
}
