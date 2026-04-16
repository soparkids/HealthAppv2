import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PATIENT_FREE_AI_LAB_INTERPRETATIONS,
  freeAiInterpretationsRemaining,
} from "@/lib/patient-lab-trial";

/**
 * GET /api/my-lab-results/check-trial
 * Patient complimentary AI lab interpretations (3 per account).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeAiInterpretationsUsed: true },
    });

    const used = user?.freeAiInterpretationsUsed ?? 0;
    const remaining = freeAiInterpretationsRemaining(used);

    return NextResponse.json({
      freeAiInterpretationsUsed: used,
      freeAiInterpretationsRemaining: remaining,
      freeInterpretationAvailable: remaining > 0,
      /** @deprecated use freeInterpretationAvailable */
      freeTrialAvailable: remaining > 0,
      limit: PATIENT_FREE_AI_LAB_INTERPRETATIONS,
    });
  } catch (error) {
    console.error("Check free trial error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
