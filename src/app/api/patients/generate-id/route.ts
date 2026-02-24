import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  // Get the org's patient number prefix
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { patientNumberPrefix: true },
  });
  const prefix = org?.patientNumberPrefix || "P";

  const lastPatient = await prisma.patient.findFirst({
    where: { organizationId },
    orderBy: { patientNumber: "desc" },
    select: { patientNumber: true },
  });

  let nextNum = 1;
  if (lastPatient) {
    const match = lastPatient.patientNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return NextResponse.json({
    patientNumber: `${prefix}${String(nextNum).padStart(4, "0")}`,
    prefix,
  });
}
