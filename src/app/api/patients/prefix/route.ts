import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { updatePatientPrefixSchema } from "@/lib/validations/clinical";

/** GET current prefix */
export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { patientNumberPrefix: true },
  });

  return NextResponse.json({ prefix: org?.patientNumberPrefix || "P" });
}

/** PUT update prefix (OWNER/ADMIN only) */
export async function PUT(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const body = await request.json();
  const parsed = updatePatientPrefixSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { patientNumberPrefix: parsed.data.prefix },
    select: { patientNumberPrefix: true },
  });

  await logAudit({
    userId,
    organizationId,
    action: "UPDATE_PATIENT_PREFIX",
    entityType: "organization",
    entityId: organizationId,
    details: `Updated patient number prefix to "${parsed.data.prefix}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    prefix: org.patientNumberPrefix,
    message: `Patient number prefix updated to "${parsed.data.prefix}". New patients will be numbered ${parsed.data.prefix}0001, ${parsed.data.prefix}0002, etc.`,
  });
}
