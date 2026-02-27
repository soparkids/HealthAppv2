import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getConfiguredProviders, type AIProvider } from "./ai-providers";

// --- Types ---

export interface EquipmentProfile {
  name: string;
  type: string;
  serialNumber: string;
  manufacturer?: string;
  model?: string;
  installDate?: string;
  warrantyExpiry?: string;
  location?: string;
  status: string;
  ageInDays?: number;
}

export interface MaintenanceHistory {
  type: string;
  description: string;
  performedBy: string;
  cost?: number;
  partsReplaced?: string;
  date: string;
}

export interface SensorTrend {
  metricType: string;
  readings: Array<{ value: number; timestamp: string }>;
  average: number;
  min: number;
  max: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface PredictionRequest {
  equipment: EquipmentProfile;
  maintenanceHistory: MaintenanceHistory[];
  sensorTrends: SensorTrend[];
}

export interface PredictionResult {
  provider: AIProvider;
  model: string;
  riskScore: number;
  predictedFailureDate: string | null;
  recommendedAction: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasoning: string;
  tokenUsage: number;
  latencyMs: number;
}

// --- Prediction Prompt ---

const SYSTEM_PROMPT = `You are a medical equipment predictive maintenance AI for a healthcare facility. Your role is to analyze equipment data, maintenance history, and sensor readings to predict potential failures and recommend maintenance actions.

IMPORTANT:
- Base your assessment on the provided data only.
- Be conservative — false negatives (missing a real failure) are worse than false positives.
- Consider equipment age, maintenance frequency, sensor trends, and manufacturer specs.
- Equipment in healthcare settings has patient safety implications.

For each equipment analysis, provide:
1. RISK_SCORE: A number from 0.0 to 1.0 indicating failure probability in the next 30 days. 0.0 = no risk, 1.0 = imminent failure.
2. PREDICTED_FAILURE_DATE: An ISO date string (YYYY-MM-DD) for estimated failure, or null if no failure predicted within 90 days.
3. RECOMMENDED_ACTION: A specific, actionable maintenance recommendation (1-3 sentences).
4. URGENCY: One of: LOW, MEDIUM, HIGH, CRITICAL — based on risk score and patient safety impact.
5. REASONING: Brief explanation of your assessment (2-4 sentences).

Urgency guidelines:
- LOW (risk < 0.25): Routine monitoring, schedule during next maintenance window
- MEDIUM (risk 0.25-0.50): Schedule maintenance within 2 weeks
- HIGH (risk 0.50-0.75): Schedule maintenance within 48 hours
- CRITICAL (risk > 0.75): Immediate attention required, consider taking equipment offline

Respond ONLY with valid JSON in this exact format:
{
  "riskScore": 0.0-1.0,
  "predictedFailureDate": "YYYY-MM-DD" or null,
  "recommendedAction": "...",
  "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
  "reasoning": "..."
}`;

function buildPredictionPrompt(req: PredictionRequest): string {
  let prompt = `Please analyze the following medical equipment and predict maintenance needs:\n\n`;

  prompt += `=== EQUIPMENT PROFILE ===\n`;
  prompt += `Name: ${req.equipment.name}\n`;
  prompt += `Type: ${req.equipment.type}\n`;
  prompt += `Serial Number: ${req.equipment.serialNumber}\n`;
  if (req.equipment.manufacturer) prompt += `Manufacturer: ${req.equipment.manufacturer}\n`;
  if (req.equipment.model) prompt += `Model: ${req.equipment.model}\n`;
  if (req.equipment.installDate) prompt += `Install Date: ${req.equipment.installDate}\n`;
  if (req.equipment.warrantyExpiry) prompt += `Warranty Expiry: ${req.equipment.warrantyExpiry}\n`;
  if (req.equipment.location) prompt += `Location: ${req.equipment.location}\n`;
  prompt += `Current Status: ${req.equipment.status}\n`;
  if (req.equipment.ageInDays !== undefined) prompt += `Age: ${req.equipment.ageInDays} days\n`;

  if (req.maintenanceHistory.length > 0) {
    prompt += `\n=== MAINTENANCE HISTORY (last ${req.maintenanceHistory.length} records) ===\n`;
    for (const log of req.maintenanceHistory) {
      prompt += `- [${log.date}] ${log.type}: ${log.description}`;
      if (log.cost) prompt += ` (cost: $${log.cost})`;
      if (log.partsReplaced) prompt += ` (parts: ${log.partsReplaced})`;
      prompt += `\n`;
    }
  } else {
    prompt += `\n=== MAINTENANCE HISTORY ===\nNo maintenance records available.\n`;
  }

  if (req.sensorTrends.length > 0) {
    prompt += `\n=== SENSOR TRENDS ===\n`;
    for (const trend of req.sensorTrends) {
      prompt += `- ${trend.metricType}: avg=${trend.average.toFixed(2)}, min=${trend.min.toFixed(2)}, max=${trend.max.toFixed(2)}, trend=${trend.trend}`;
      prompt += ` (${trend.readings.length} readings)\n`;
    }
  } else {
    prompt += `\n=== SENSOR TRENDS ===\nNo sensor data available.\n`;
  }

  return prompt;
}

// --- Provider Implementations ---

async function predictWithOpenAI(req: PredictionRequest): Promise<PredictionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey });
  const model = "gpt-4o";
  const start = Date.now();

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPredictionPrompt(req) },
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
    riskScore: parsed.riskScore,
    predictedFailureDate: parsed.predictedFailureDate,
    recommendedAction: parsed.recommendedAction,
    urgency: parsed.urgency,
    reasoning: parsed.reasoning,
    tokenUsage: response.usage?.total_tokens ?? 0,
    latencyMs,
  };
}

async function predictWithAnthropic(req: PredictionRequest): Promise<PredictionResult> {
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
      { role: "user", content: buildPredictionPrompt(req) },
    ],
  });

  const latencyMs = Date.now() - start;
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic");

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr);
  return {
    provider: "anthropic",
    model,
    riskScore: parsed.riskScore,
    predictedFailureDate: parsed.predictedFailureDate,
    recommendedAction: parsed.recommendedAction,
    urgency: parsed.urgency,
    reasoning: parsed.reasoning,
    tokenUsage: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    latencyMs,
  };
}

async function predictWithGoogle(req: PredictionRequest): Promise<PredictionResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
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

      const result = await generativeModel.generateContent(buildPredictionPrompt(req));
      const latencyMs = Date.now() - start;

      const text = result.response.text();
      if (!text) throw new Error(`Empty response from Google (${model})`);

      const parsed = JSON.parse(text);
      const usage = result.response.usageMetadata;
      return {
        provider: "google",
        model,
        riskScore: parsed.riskScore,
        predictedFailureDate: parsed.predictedFailureDate,
        recommendedAction: parsed.recommendedAction,
        urgency: parsed.urgency,
        reasoning: parsed.reasoning,
        tokenUsage: usage?.totalTokenCount ?? 0,
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

const PREDICTION_PROVIDERS: Record<AIProvider, (req: PredictionRequest) => Promise<PredictionResult>> = {
  openai: predictWithOpenAI,
  anthropic: predictWithAnthropic,
  google: predictWithGoogle,
};

const DEFAULT_FALLBACK_ORDER: AIProvider[] = ["openai", "anthropic", "google"];

/**
 * Predict equipment maintenance needs using multi-provider fallback.
 */
export async function predictEquipmentFailure(
  req: PredictionRequest,
  preferredProvider?: AIProvider
): Promise<PredictionResult> {
  const configured = getConfiguredProviders();
  if (configured.length === 0) {
    throw new Error("No AI providers configured. Set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY");
  }

  let providerOrder: AIProvider[];
  if (preferredProvider && configured.includes(preferredProvider)) {
    providerOrder = [preferredProvider, ...DEFAULT_FALLBACK_ORDER.filter((p) => p !== preferredProvider)];
  } else {
    providerOrder = [...DEFAULT_FALLBACK_ORDER];
  }

  providerOrder = providerOrder.filter((p) => configured.includes(p));

  const errors: Array<{ provider: AIProvider; error: string }> = [];

  for (const provider of providerOrder) {
    try {
      const result = await PREDICTION_PROVIDERS[provider](req);

      // Validate required fields
      if (result.recommendedAction === undefined || result.urgency === undefined) {
        throw new Error("Incomplete response: missing required fields");
      }

      // Validate urgency
      const validUrgency = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
      if (!validUrgency.includes(result.urgency)) {
        result.urgency = "MEDIUM";
      }

      // Clamp risk score to 0-1
      result.riskScore = Math.max(0, Math.min(1, result.riskScore ?? 0.5));

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ provider, error: errorMsg });
      console.error(`AI provider ${provider} failed for prediction:`, errorMsg);
    }
  }

  throw new Error(
    `All AI providers failed. Errors: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`
  );
}
