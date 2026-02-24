import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const body = await request.json();
  const { userEmail } = body;

  if (!userEmail) {
    return NextResponse.json({ error: "User email is required" }, { status: 400 });
  }

  const patient = await prisma.patient.findFirst({
    where: { id, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const userToLink = await prisma.user.findUnique({
    where: { email: userEmail },
  });
  if (!userToLink) {
    return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: { linkedUserId: userToLink.id },
  });

  await logAudit({
    userId,
    organizationId,
    action: "LINK_PATIENT_ACCOUNT",
    entityType: "patient",
    entityId: id,
    details: `Linked patient ${patient.patientNumber} to user ${userEmail}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ patient: updated });
}
