import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encryption";
import { interpretLabResult, getConfiguredProviders } from "@/lib/ai-providers";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * POST /api/my-lab-results/[id]/interpret
 * One-time free AI interpretation for patients.
 * No org membership required - uses the patient's free trial.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: labResultId } = await params;
    const userId = session.user.id;

    // Check if user has already used their free trial
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeTrialUsed: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.freeTrialUsed) {
      return NextResponse.json(
        {
          error: "Free trial already used",
          message: "You have already used your one-time free AI interpretation. Contact your healthcare provider for additional interpretations.",
        },
        { status: 403 }
      );
    }

    // Check that AI providers are configured
    const configured = getConfiguredProviders();
    if (configured.length === 0) {
      return NextResponse.json(
        {
          error: "AI interpretation unavailable",
          message: "No AI providers are configured. Please try again later.",
        },
        { status: 503 }
      );
    }

    // Verify the lab result belongs to a patient linked to this user
    const linkedPatients = await prisma.patient.findMany({
      where: { linkedUserId: userId },
      select: { id: true },
    });

    if (linkedPatients.length === 0) {
      return NextResponse.json(
        { error: "No linked patient records found" },
        { status: 404 }
      );
    }

    const patientIds = linkedPatients.map((p) => p.id);

    const labResult = await prisma.labResult.findFirst({
      where: {
        id: labResultId,
        patientId: { in: patientIds },
      },
      include: {
        patient: {
          select: { id: true, patientNumber: true, firstName: true, lastName: true, organizationId: true },
        },
      },
    });

    if (!labResult) {
      return NextResponse.json(
        { error: "Lab result not found or not accessible" },
        { status: 404 }
      );
    }

    // Create a pending interpretation record
    const interpretation = await prisma.labInterpretation.create({
      data: {
        labResultId,
        provider: "pending",
        model: "pending",
        status: "PROCESSING",
        requestedBy: userId,
      },
    });

    // Decrypt the result value for interpretation
    const decryptedValue = decrypt(labResult.resultValue);
    const decryptedNotes = labResult.notes ? decrypt(labResult.notes) : undefined;

    // Call the AI multi-provider service
    const result = await interpretLabResult({
      testName: labResult.testName,
      resultValue: decryptedValue,
      unit: labResult.unit || undefined,
      referenceRange: labResult.referenceRange || undefined,
      datePerformed: labResult.datePerformed.toISOString().split("T")[0],
      notes: decryptedNotes,
    });

    // Update the interpretation record with results
    const updatedInterpretation = await prisma.labInterpretation.update({
      where: { id: interpretation.id },
      data: {
        provider: result.provider,
        model: result.model,
        status: "COMPLETED",
        interpretation: encrypt(result.interpretation),
        summary: encrypt(result.summary),
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        recommendations: encrypt(JSON.stringify(result.recommendations)),
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
      },
    });

    // Update the lab result with the latest interpretation
    await prisma.labResult.update({
      where: { id: labResultId },
      data: {
        interpretationStatus: "COMPLETED",
        interpretationText: encrypt(result.interpretation),
        interpretationModel: `${result.provider}/${result.model}`,
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        recommendations: encrypt(JSON.stringify(result.recommendations)),
        interpretedAt: new Date(),
        interpretedBy: userId,
      },
    });

    // Mark free trial as used
    await prisma.user.update({
      where: { id: userId },
      data: { freeTrialUsed: true },
    });

    // Audit log
    await logAudit({
      userId,
      organizationId: labResult.patient.organizationId,
      action: "PATIENT_FREE_TRIAL_INTERPRET",
      entityType: "lab_result",
      entityId: labResultId,
      details: `Patient used free trial AI interpretation — ${result.provider}/${result.model} — risk: ${result.riskLevel}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      interpretation: {
        id: updatedInterpretation.id,
        provider: result.provider,
        model: result.model,
        status: "COMPLETED",
        interpretation: result.interpretation,
        summary: result.summary,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        recommendations: result.recommendations,
        createdAt: updatedInterpretation.createdAt,
      },
      freeTrialUsed: true,
      message: "This was your one-time free AI interpretation.",
    });
  } catch (error) {
    console.error("Patient interpretation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/my-lab-results/[id]/interpret
 * Check free trial status for the current user.
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
