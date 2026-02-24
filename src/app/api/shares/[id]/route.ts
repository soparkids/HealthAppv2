import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const share = await prisma.sharedRecord.findFirst({
    where: { id, sharedByUserId: auth.userId },
    include: { medicalRecord: { select: { organizationId: true } } },
  });

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  await prisma.sharedRecord.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: share.medicalRecord.organizationId || undefined,
    action: "REVOKE_SHARE",
    entityType: "sharedRecord",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
