import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Types ---

export type AIProvider = "openai" | "anthropic" | "google";

export interface InterpretationRequest {
  testName: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  datePerformed: string;
  notes?: string;
}

export interface InterpretationResult {
  provider: AIProvider;
  model: string;
  interpretation: string;
  summary: string;
  riskLevel: "NORMAL" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  confidence: number;
  recommendations: string[];
  tokenUsage: number;
  latencyMs: number;
}

// --- Medical Prompt ---

const SYSTEM_PROMPT = `You are a clinical laboratory data interpreter for a healthcare application. Your role is to provide clear, accurate interpretations of lab test results.

IMPORTANT DISCLAIMERS:
- You are an AI assistant and NOT a substitute for professional medical advice.
- All interpretations should be reviewed by a qualified healthcare professional.
- You must not diagnose conditions; only interpret the lab values presented.

For each lab result, provide:
1. INTERPRETATION: A clear explanation of what this result means in plain English (2-4 sentences).
2. SUMMARY: A one-line brief summary.
3. RISK_LEVEL: One of: NORMAL, LOW, MODERATE, HIGH, CRITICAL — based on how far the result deviates from reference ranges or clinical significance.
4. CONFIDENCE: A number from 0.0 to 1.0 indicating how confident you are in this interpretation. Use lower confidence when reference ranges are missing or the test is unusual.
5. RECOMMENDATIONS: An array of 1-5 specific recommended follow-up actions.

Respond ONLY with valid JSON in this exact format:
{
  "interpretation": "...",
  "summary": "...",
  "riskLevel": "NORMAL|LOW|MODERATE|HIGH|CRITICAL",
  "confidence": 0.0-1.0,
  "recommendations": ["...", "..."]
}`;

function buildUserPrompt(req: InterpretationRequest): string {
  let prompt = `Please interpret the following lab test result:\n\n`;
  prompt += `Test Name: ${req.testName}\n`;
  prompt += `Result Value: ${req.resultValue}`;
  if (req.unit) prompt += ` ${req.unit}`;
  prompt += `\n`;
  if (req.referenceRange) prompt += `Reference Range: ${req.referenceRange}\n`;
  prompt += `Date Performed: ${req.datePerformed}\n`;
  if (req.notes) prompt += `Clinical Notes: ${req.notes}\n`;
  return prompt;
}

// --- Provider Implementations ---

async function interpretWithOpenAI(req: InterpretationRequest): Promise<InterpretationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey });
  const model = "gpt-4o";
  const start = Date.now();

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(req) },
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const latencyMs = Date.now() - start;
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content);
  return {
    provider: "openai",
    model,
    interpretation: parsed.interpretation,
    summary: parsed.summary,
    riskLevel: parsed.riskLevel,
    confidence: parsed.confidence,
    recommendations: parsed.recommendations,
    tokenUsage: response.usage?.total_tokens ?? 0,
    latencyMs,
  };
}

async function interpretWithAnthropic(req: InterpretationRequest): Promise<InterpretationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });
  const model = "claude-sonnet-4-20250514";
  const start = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt(req) },
    ],
  });

  const latencyMs = Date.now() - start;
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic");

  // Extract JSON from response (Claude may wrap it in markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr);
  return {
    provider: "anthropic",
    model,
    interpretation: parsed.interpretation,
    summary: parsed.summary,
    riskLevel: parsed.riskLevel,
    confidence: parsed.confidence,
    recommendations: parsed.recommendations,
    tokenUsage: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    latencyMs,
  };
}

async function interpretWithGoogle(req: InterpretationRequest): Promise<InterpretationResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  // Try models in order of preference (gemini-1.5 is retired; gemini-2.0 sunsets June 2026)
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
        },
      });
      const start = Date.now();

      const result = await generativeModel.generateContent(buildUserPrompt(req));
      const latencyMs = Date.now() - start;

      const text = result.response.text();
      if (!text) throw new Error(`Empty response from Google (${model})`);

      const parsed = JSON.parse(text);
      const usage = result.response.usageMetadata;
      return {
        provider: "google",
        model,
        interpretation: parsed.interpretation,
        summary: parsed.summary,
        riskLevel: parsed.riskLevel,
        confidence: parsed.confidence,
        recommendations: parsed.recommendations,
        tokenUsage: (usage?.totalTokenCount ?? 0),
        latencyMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`Google model ${model} failed:`, lastError.message);
    }
  }

  throw new Error(`Google AI failed (tried ${models.join(", ")}): ${lastError?.message}`);
}

// --- Provider Registry ---

const PROVIDERS: Record<AIProvider, (req: InterpretationRequest) => Promise<InterpretationResult>> = {
  openai: interpretWithOpenAI,
  anthropic: interpretWithAnthropic,
  google: interpretWithGoogle,
};

// Fallback order: OpenAI → Anthropic → Google
const DEFAULT_FALLBACK_ORDER: AIProvider[] = ["openai", "anthropic", "google"];

/**
 * Check which AI providers are configured (have API keys set).
 */
export function getConfiguredProviders(): AIProvider[] {
  const configured: AIProvider[] = [];
  if (process.env.OPENAI_API_KEY) configured.push("openai");
  if (process.env.ANTHROPIC_API_KEY) configured.push("anthropic");
  if (process.env.GOOGLE_AI_API_KEY) configured.push("google");
  return configured;
}

/**
 * Interpret a lab result using multi-provider fallback.
 * Tries the preferred provider first, then falls back through others.
 */
export async function interpretLabResult(
  req: InterpretationRequest,
  preferredProvider?: AIProvider
): Promise<InterpretationResult> {
  const configured = getConfiguredProviders();
  if (configured.length === 0) {
    throw new Error("No AI providers configured. Set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY");
  }

  // Build provider order: preferred first, then default fallback order
  let providerOrder: AIProvider[];
  if (preferredProvider && configured.includes(preferredProvider)) {
    providerOrder = [preferredProvider, ...DEFAULT_FALLBACK_ORDER.filter((p) => p !== preferredProvider)];
  } else {
    providerOrder = [...DEFAULT_FALLBACK_ORDER];
  }

  // Filter to only configured providers
  providerOrder = providerOrder.filter((p) => configured.includes(p));

  const errors: Array<{ provider: AIProvider; error: string }> = [];

  for (const provider of providerOrder) {
    try {
      const result = await PROVIDERS[provider](req);

      // Validate the response has required fields
      if (!result.interpretation || !result.summary || !result.riskLevel) {
        throw new Error("Incomplete response: missing required fields");
      }

      // Validate riskLevel is one of the allowed values
      const validRiskLevels = ["NORMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"];
      if (!validRiskLevels.includes(result.riskLevel)) {
        result.riskLevel = "MODERATE" as InterpretationResult["riskLevel"]; // safe fallback
      }

      // Clamp confidence to 0-1
      result.confidence = Math.max(0, Math.min(1, result.confidence ?? 0.5));

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ provider, error: errorMsg });
      console.error(`AI provider ${provider} failed:`, errorMsg);
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error(
    `All AI providers failed. Errors: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`
  );
}
