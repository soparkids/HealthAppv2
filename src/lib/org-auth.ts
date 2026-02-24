import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/generated/prisma/client";

export interface OrgAuthContext {
  userId: string;
  email: string;
  role: string; // platform role (PATIENT, PROVIDER, ADMIN)
  organizationId: string;
  orgRole: OrgRole;
}

/**
 * Validates session + organization membership in one call.
 * Returns the auth context or a NextResponse error.
 */
export async function withOrgAuth(
  request: Request,
  allowedOrgRoles?: OrgRole[]
): Promise<OrgAuthContext | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.headers.get("x-organization-id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization context required" },
      { status: 400 }
    );
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  if (allowedOrgRoles && !allowedOrgRoles.includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return {
    userId: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
    organizationId,
    orgRole: membership.role,
  };
}

/**
 * Simple auth check without org context (for patient-facing routes).
 */
export async function withAuth(): Promise<
  { userId: string; email: string; role: string } | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    userId: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
  };
}
