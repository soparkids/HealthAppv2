import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";
import { parseReportTerms } from "@/services/report-reader";
import { decryptFields, SENSITIVE_REPORT_FIELDS } from "@/lib/encryption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const report = await prisma.report.findFirst({
      where: {
        medicalRecordId: id,
        medicalRecord: { userId: auth.userId },
      },
      include: {
        medicalRecord: {
          select: {
            id: true,
            title: true,
            type: true,
            bodyPart: true,
            facility: true,
            recordDate: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const decryptedReport = decryptFields(report, [...SENSITIVE_REPORT_FIELDS]);
    const terms = parseReportTerms(decryptedReport.content);

    return NextResponse.json({
      ...decryptedReport,
      highlightedTerms: terms,
    });
  } catch (error) {
    console.error("Failed to load report:", error);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 }
    );
  }
}
