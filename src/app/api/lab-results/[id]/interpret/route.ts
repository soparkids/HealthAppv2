import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { decrypt, encrypt } from "@/lib/encryption";
import { interpretLabResult, getConfiguredProviders, type AIProvider } from "@/lib/ai-providers";
import { interpretLabResultSchema } from "@/lib/validations/clinical";

/**
 * POST /api/lab-results/[id]/interpret
 * Trigger AI interpretation of a lab result.
 * Requires: ai_interpretation feature + lab_results feature
 * Roles: OWNER, ADMIN, DOCTOR
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  // Check both feature flags
  const labGate = await requireFeature(organizationId, "lab_results");
  if (labGate) return labGate;
  const aiGate = await requireFeature(organizationId, "ai_interpretation");
  if (aiGate) return aiGate;

  // Check that at least one AI provider is configured
  const configured = getConfiguredProviders();
  if (configured.length === 0) {
    return NextResponse.json(
      {
        error: "AI interpretation unavailable",
        message: "No AI providers are configured. Contact your system administrator to set up API keys.",
      },
      { status: 503 }
    );
  }

  // Parse optional body for preferred provider
  let preferredProvider: AIProvider | undefined;
  try {
    const body = await request.json();
    const parsed = interpretLabResultSchema.safeParse(body);
    if (parsed.success && parsed.data.preferredProvider) {
      preferredProvider = parsed.data.preferredProvider;
    }
  } catch {
    // No body or invalid JSON — that's fine, use default provider order
  }

  // Fetch the lab result
  const labResult = await prisma.labResult.findFirst({
    where: { id, organizationId },
    include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
  });

  if (!labResult) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  // Create a pending interpretation record
  const interpretation = await prisma.labInterpretation.create({
    data: {
      labResultId: id,
      provider: "pending",
      model: "pending",
      status: "PROCESSING",
      requestedBy: userId,
    },
  });

  try {
    // Decrypt the result value for interpretation
    const decryptedValue = decrypt(labResult.resultValue);
    const decryptedNotes = labResult.notes ? decrypt(labResult.notes) : undefined;

    // Call the AI multi-provider service
    const result = await interpretLabResult(
      {
        testName: labResult.testName,
        resultValue: decryptedValue,
        unit: labResult.unit || undefined,
        referenceRange: labResult.referenceRange || undefined,
        datePerformed: labResult.datePerformed.toISOString().split("T")[0],
        notes: decryptedNotes,
      },
      preferredProvider
    );

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
      where: { id },
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

    // Audit log
    await logAudit({
      userId,
      organizationId,
      action: "INTERPRET_LAB_RESULT",
      entityType: "lab_result",
      entityId: id,
      details: `AI interpretation by ${result.provider}/${result.model} — risk: ${result.riskLevel}, confidence: ${result.confidence}`,
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
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
        createdAt: updatedInterpretation.createdAt,
      },
      labResult: {
        id: labResult.id,
        testName: labResult.testName,
        resultValue: decryptedValue,
        unit: labResult.unit,
        referenceRange: labResult.referenceRange,
        patient: labResult.patient,
      },
    });
  } catch (error) {
    // Update interpretation record as failed
    await prisma.labInterpretation.update({
      where: { id: interpretation.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Update lab result status
    await prisma.labResult.update({
      where: { id },
      data: { interpretationStatus: "FAILED" },
    });

    return NextResponse.json(
      {
        error: "Interpretation failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
        interpretationId: interpretation.id,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lab-results/[id]/interpret
 * Get interpretation history for a lab result.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const labGate = await requireFeature(organizationId, "lab_results");
  if (labGate) return labGate;

  // Verify lab result belongs to org
  const labResult = await prisma.labResult.findFirst({
    where: { id, organizationId },
  });

  if (!labResult) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  // Fetch all interpretations for this lab result
  const interpretations = await prisma.labInterpretation.findMany({
    where: { labResultId: id },
    orderBy: { createdAt: "desc" },
  });

  // Decrypt interpretation fields
  const decrypted = interpretations.map((interp) => ({
    id: interp.id,
    provider: interp.provider,
    model: interp.model,
    status: interp.status,
    interpretation: interp.interpretation ? decrypt(interp.interpretation) : null,
    summary: interp.summary ? decrypt(interp.summary) : null,
    riskLevel: interp.riskLevel,
    confidence: interp.confidence,
    recommendations: interp.recommendations
      ? JSON.parse(decrypt(interp.recommendations))
      : null,
    tokenUsage: interp.tokenUsage,
    latencyMs: interp.latencyMs,
    errorMessage: interp.errorMessage,
    createdAt: interp.createdAt,
  }));

  // Audit log
  await logAudit({
    userId,
    organizationId,
    action: "VIEW_INTERPRETATION",
    entityType: "lab_result",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    labResultId: id,
    interpretations: decrypted,
    total: decrypted.length,
  });
}
