import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptFields, SENSITIVE_LAB_RESULT_FIELDS } from "@/lib/encryption";

/**
 * GET /api/my-lab-results
 * Returns lab results for patients linked to the current user account.
 * No org membership required — just a valid session with linked patient records.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all patient records linked to this user
  const linkedPatients = await prisma.patient.findMany({
    where: { linkedUserId: session.user.id },
    select: { id: true, patientNumber: true, firstName: true, lastName: true, organizationId: true },
  });

  if (linkedPatients.length === 0) {
    return NextResponse.json({ results: [], message: "No linked patient records found" });
  }

  const patientIds = linkedPatients.map((p) => p.id);

  const labResults = await prisma.labResult.findMany({
    where: { patientId: { in: patientIds } },
    include: {
      patient: {
        select: { id: true, patientNumber: true, firstName: true, lastName: true },
      },
      interpretations: {
        select: {
          id: true,
          riskLevel: true,
          confidence: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { datePerformed: "desc" },
    take: 50,
  });

  const decryptedResults = labResults.map((r) => {
    const { interpretations, ...rest } = r;
    return {
      ...decryptFields(rest, [...SENSITIVE_LAB_RESULT_FIELDS]),
      latestInterpretation: interpretations[0] || null,
    };
  });

  return NextResponse.json({ results: decryptedResults });
}
