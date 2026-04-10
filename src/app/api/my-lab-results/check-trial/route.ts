import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my-lab-results/check-trial
 * Check if the current user has a free trial available.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeTrialUsed: true },
    });

    return NextResponse.json({
      freeTrialUsed: user?.freeTrialUsed ?? false,
      freeTrialAvailable: !(user?.freeTrialUsed ?? false),
    });
  } catch (error) {
    console.error("Check free trial error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
