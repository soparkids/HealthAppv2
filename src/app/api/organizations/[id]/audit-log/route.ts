import { NextRequest, NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";

// GET: View audit log (OWNER/ADMIN only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const action = searchParams.get("action");

  const where: Record<string, unknown> = { organizationId: id };
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
