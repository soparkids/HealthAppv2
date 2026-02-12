import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  });

  if (!provider) {
    return NextResponse.json({ error: "Not a provider" }, { status: 403 });
  }

  const shares = await prisma.sharedRecord.findMany({
    where: {
      sharedWithEmail: session.user.email!,
      revokedAt: null,
    },
    include: {
      sharedBy: {
        select: { id: true, name: true, email: true },
      },
      medicalRecord: {
        select: { id: true, title: true, type: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const uniquePatients = new Set(shares.map((s) => s.sharedBy.id));

  return NextResponse.json({
    totalPatients: uniquePatients.size,
    pendingReviews: shares.length,
    recentShares: shares.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      sharedBy: s.sharedBy,
      medicalRecord: s.medicalRecord,
    })),
  });
}
