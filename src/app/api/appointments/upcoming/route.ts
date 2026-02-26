import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  // Allow reading upcoming appointments even if feature is disabled

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      appointmentDate: { gte: today },
      status: "SCHEDULED",
    },
    include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
    orderBy: [{ appointmentDate: "asc" }, { appointmentTime: "asc" }],
    take: limit,
  });

  return NextResponse.json({ appointments });
}
