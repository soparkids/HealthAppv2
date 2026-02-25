import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getConfiguredProviders,
  interpretLabResult,
  type InterpretationRequest,
} from "./ai-providers";

// Mock the AI SDK modules using classes for proper constructor support
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    interpretation:
                      "Hemoglobin is within normal range for adult males.",
                    summary: "Normal hemoglobin level",
                    riskLevel: "NORMAL",
                    confidence: 0.92,
                    recommendations: [
                      "Continue routine monitoring",
                      "Maintain balanced diet",
                    ],
                  }),
                },
              },
            ],
            usage: { total_tokens: 150 },
          }),
        },
      };
    },
  };
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                interpretation:
                  "The hemoglobin value of 14.5 g/dL is within the normal reference range.",
                summary: "Normal hemoglobin",
                riskLevel: "NORMAL",
                confidence: 0.95,
                recommendations: ["Continue routine bloodwork"],
              }),
            },
          ],
          usage: { input_tokens: 100, output_tokens: 80 },
        }),
      };
    },
  };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class MockGoogleAI {
      getGenerativeModel = vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                interpretation: "Hemoglobin level is normal.",
                summary: "Normal range",
                riskLevel: "NORMAL",
                confidence: 0.88,
                recommendations: ["Routine follow-up in 6 months"],
              }),
            usageMetadata: { totalTokenCount: 120 },
          },
        }),
      });
    },
  };
});

const sampleRequest: InterpretationRequest = {
  testName: "Hemoglobin",
  resultValue: "14.5",
  unit: "g/dL",
  referenceRange: "13.5-17.5 g/dL",
  datePerformed: "2026-02-25",
  notes: "Routine check",
};

describe("getConfiguredProviders", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns empty array when no providers are configured", () => {
    expect(getConfiguredProviders()).toEqual([]);
  });

  it("detects OpenAI when OPENAI_API_KEY is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(getConfiguredProviders()).toContain("openai");
  });

  it("detects Anthropic when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getConfiguredProviders()).toContain("anthropic");
  });

  it("detects Google when GOOGLE_AI_API_KEY is set", () => {
    process.env.GOOGLE_AI_API_KEY = "AIza-test";
    expect(getConfiguredProviders()).toContain("google");
  });

  it("detects all providers when all keys are set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GOOGLE_AI_API_KEY = "AIza-test";
    const providers = getConfiguredProviders();
    expect(providers).toHaveLength(3);
    expect(providers).toContain("openai");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("google");
  });
});

describe("interpretLabResult", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when no providers are configured", async () => {
    await expect(interpretLabResult(sampleRequest)).rejects.toThrow(
      "No AI providers configured"
    );
  });

  it("uses OpenAI when configured and returns valid result", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const result = await interpretLabResult(sampleRequest);
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
    expect(result.interpretation).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(result.riskLevel).toBe("NORMAL");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.recommendations).toBeInstanceOf(Array);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.tokenUsage).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("uses Anthropic when configured", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const result = await interpretLabResult(sampleRequest);
    expect(result.provider).toBe("anthropic");
    expect(result.interpretation).toBeTruthy();
    expect(result.summary).toBeTruthy();
  });

  it("uses Google when configured", async () => {
    process.env.GOOGLE_AI_API_KEY = "AIza-test";
    const result = await interpretLabResult(sampleRequest);
    expect(result.provider).toBe("google");
    expect(result.interpretation).toBeTruthy();
  });

  it("uses preferred provider when specified", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const result = await interpretLabResult(sampleRequest, "anthropic");
    expect(result.provider).toBe("anthropic");
  });

  it("defaults to OpenAI first in fallback order", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GOOGLE_AI_API_KEY = "AIza-test";
    const result = await interpretLabResult(sampleRequest);
    expect(result.provider).toBe("openai");
  });
});

describe("interpretLabResultSchema validation", () => {
  it("accepts empty body (no preferred provider)", async () => {
    const { interpretLabResultSchema } = await import(
      "./validations/clinical"
    );
    expect(interpretLabResultSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid provider names", async () => {
    const { interpretLabResultSchema } = await import(
      "./validations/clinical"
    );
    expect(
      interpretLabResultSchema.safeParse({ preferredProvider: "openai" }).success
    ).toBe(true);
    expect(
      interpretLabResultSchema.safeParse({ preferredProvider: "anthropic" })
        .success
    ).toBe(true);
    expect(
      interpretLabResultSchema.safeParse({ preferredProvider: "google" }).success
    ).toBe(true);
  });

  it("rejects invalid provider names", async () => {
    const { interpretLabResultSchema } = await import(
      "./validations/clinical"
    );
    expect(
      interpretLabResultSchema.safeParse({ preferredProvider: "invalid" })
        .success
    ).toBe(false);
    expect(
      interpretLabResultSchema.safeParse({ preferredProvider: "chatgpt" })
        .success
    ).toBe(false);
  });
});
