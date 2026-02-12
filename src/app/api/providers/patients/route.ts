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
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const patientMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
      recordCount: number;
      latestShare: Date;
    }
  >();

  for (const share of shares) {
    const existing = patientMap.get(share.sharedBy.id);
    if (existing) {
      existing.recordCount++;
      if (share.createdAt > existing.latestShare) {
        existing.latestShare = share.createdAt;
      }
    } else {
      patientMap.set(share.sharedBy.id, {
        id: share.sharedBy.id,
        name: share.sharedBy.name,
        email: share.sharedBy.email,
        avatar: share.sharedBy.avatar,
        recordCount: 1,
        latestShare: share.createdAt,
      });
    }
  }

  const patients = Array.from(patientMap.values()).sort(
    (a, b) => b.latestShare.getTime() - a.latestShare.getTime()
  );

  return NextResponse.json(patients);
}
