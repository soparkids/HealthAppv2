import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const share = await prisma.sharedRecord.findUnique({
    where: { token },
    include: {
      medicalRecord: {
        select: {
          id: true,
          title: true,
          type: true,
          bodyPart: true,
          facility: true,
          recordDate: true,
          fileUrl: true,
          fileType: true,
        },
      },
    },
  });

  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (share.revokedAt) {
    return NextResponse.json({ error: "Revoked" }, { status: 410 });
  }

  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  let report = null;
  if (share.permission === "VIEW" || share.permission === "DOWNLOAD") {
    const reportData = await prisma.report.findUnique({
      where: { medicalRecordId: share.medicalRecordId },
      select: { content: true, summary: true },
    });
    report = reportData;
  }

  return NextResponse.json({
    record: share.medicalRecord,
    report,
    permission: share.permission,
    expiresAt: share.expiresAt,
  });
}
