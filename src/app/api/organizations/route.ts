import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { logAudit, getClientIp } from "@/lib/audit";
import { seedDefaultFeatures } from "@/lib/features";

// GET: List organizations the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
    memberCount: m.organization._count.members,
    createdAt: m.organization.createdAt,
  }));

  return NextResponse.json({ organizations });
}

// POST: Create a new organization (creator becomes OWNER)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, slug } = parsed.data;

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "An organization with this slug already exists" },
      { status: 409 }
    );
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  // Seed default features for the new organization
  await seedDefaultFeatures(organization.id, session.user.id);

  await logAudit({
    userId: session.user.id,
    organizationId: organization.id,
    action: "CREATE_ORGANIZATION",
    entityType: "organization",
    entityId: organization.id,
    details: `Created organization "${name}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: "OWNER",
      memberCount: organization._count.members,
      createdAt: organization.createdAt,
    },
    { status: 201 }
  );
}
