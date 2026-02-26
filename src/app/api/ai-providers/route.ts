import { NextResponse } from "next/server";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { getConfiguredProviders } from "@/lib/ai-providers";

/**
 * GET /api/ai-providers
 * Returns which AI providers are configured and available.
 * Requires: ai_interpretation feature flag.
 * Roles: OWNER, ADMIN, DOCTOR
 */
export async function GET(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const aiGate = await requireFeature(organizationId, "ai_interpretation");
  if (aiGate) return aiGate;

  const configured = getConfiguredProviders();

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      model: "gpt-4o",
      configured: configured.includes("openai"),
    },
    {
      id: "anthropic",
      name: "Anthropic",
      model: "claude-sonnet-4-6",
      configured: configured.includes("anthropic"),
    },
    {
      id: "google",
      name: "Google",
      model: "gemini-2.5-flash",
      configured: configured.includes("google"),
    },
  ];

  return NextResponse.json({
    providers,
    configuredCount: configured.length,
    fallbackOrder: configured,
    available: configured.length > 0,
  });
}
