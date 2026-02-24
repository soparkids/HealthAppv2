import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";

// GET: Get organization details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Inject org id into headers for withOrgAuth
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
  });

  const auth = await withOrgAuth(modifiedRequest);
  if (auth instanceof NextResponse) return auth;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { medicalRecords: true, members: true },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ organization });
}
