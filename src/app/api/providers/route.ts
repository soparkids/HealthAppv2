import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") || "";
  const specialty = request.nextUrl.searchParams.get("specialty") || "";

  const where: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  if (specialty) {
    andConditions.push({
      specialty: { contains: specialty, mode: "insensitive" },
    });
  }

  if (q) {
    andConditions.push({
      OR: [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { facilityName: { contains: q, mode: "insensitive" } },
        { facilityAddress: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const providers = await prisma.provider.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    take: 50,
  });

  return NextResponse.json(providers);
}
