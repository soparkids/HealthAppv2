import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  predictEquipmentFailure,
  type PredictionRequest,
} from "./equipment-prediction";

// Mock the AI SDK modules
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
                    riskScore: 0.65,
                    predictedFailureDate: "2026-04-15",
                    recommendedAction:
                      "Schedule calibration within 48 hours. The error count trend is increasing.",
                    urgency: "HIGH",
                    reasoning:
                      "Equipment age is 1100 days with increasing error counts and decreasing maintenance frequency.",
                  }),
                },
              },
            ],
            usage: { total_tokens: 280 },
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
                riskScore: 0.45,
                predictedFailureDate: null,
                recommendedAction:
                  "Schedule preventive maintenance within 2 weeks.",
                urgency: "MEDIUM",
                reasoning:
                  "Usage hours are trending up but within expected parameters.",
              }),
            },
          ],
          usage: { input_tokens: 200, output_tokens: 120 },
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
                riskScore: 0.15,
                predictedFailureDate: null,
                recommendedAction:
                  "Continue routine monitoring. No issues detected.",
                urgency: "LOW",
                reasoning: "All metrics within normal parameters.",
              }),
            usageMetadata: { totalTokenCount: 180 },
          },
        }),
      });
    },
  };
});

const sampleRequest: PredictionRequest = {
  equipment: {
    name: "MRI Scanner Room 3",
    type: "MRI",
    serialNumber: "SN-2024-001",
    manufacturer: "Siemens",
    model: "MAGNETOM Sola",
    installDate: "2023-01-15",
    warrantyExpiry: "2026-01-15",
    location: "Radiology Dept",
    status: "ACTIVE",
    ageInDays: 1100,
  },
  maintenanceHistory: [
    {
      type: "PREVENTIVE",
      description: "Annual calibration and filter replacement",
      performedBy: "Siemens Technician",
      cost: 2500,
      date: "2025-06-15",
    },
    {
      type: "CORRECTIVE",
      description: "Replaced cooling fan motor",
      performedBy: "In-house engineer",
      partsReplaced: "Cooling fan motor unit",
      cost: 850,
      date: "2025-11-20",
    },
  ],
  sensorTrends: [
    {
      metricType: "USAGE_HOURS",
      readings: [
        { value: 5200, timestamp: "2026-01-01" },
        { value: 5400, timestamp: "2026-02-01" },
      ],
      average: 5300,
      min: 5200,
      max: 5400,
      trend: "increasing",
    },
    {
      metricType: "ERROR_COUNT",
      readings: [
        { value: 3, timestamp: "2026-01-01" },
        { value: 7, timestamp: "2026-02-01" },
      ],
      average: 5,
      min: 3,
      max: 7,
      trend: "increasing",
    },
  ],
};

describe("predictEquipmentFailure", () => {
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
    await expect(predictEquipmentFailure(sampleRequest)).rejects.toThrow(
      "No AI providers configured"
    );
  });

  it("returns prediction result from OpenAI", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const result = await predictEquipmentFailure(sampleRequest);
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
    expect(result.riskScore).toBe(0.65);
    expect(result.urgency).toBe("HIGH");
    expect(result.predictedFailureDate).toBe("2026-04-15");
    expect(result.recommendedAction).toContain("calibration");
    expect(result.reasoning).toBeTruthy();
    expect(result.tokenUsage).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns prediction result from Anthropic", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const result = await predictEquipmentFailure(sampleRequest);
    expect(result.provider).toBe("anthropic");
    expect(result.riskScore).toBe(0.45);
    expect(result.urgency).toBe("MEDIUM");
    expect(result.predictedFailureDate).toBeNull();
    expect(result.recommendedAction).toContain("preventive maintenance");
  });

  it("returns prediction result from Google", async () => {
    process.env.GOOGLE_AI_API_KEY = "AIza-test";
    const result = await predictEquipmentFailure(sampleRequest);
    expect(result.provider).toBe("google");
    expect(result.riskScore).toBe(0.15);
    expect(result.urgency).toBe("LOW");
    expect(result.recommendedAction).toContain("routine monitoring");
  });

  it("uses preferred provider when specified", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const result = await predictEquipmentFailure(sampleRequest, "anthropic");
    expect(result.provider).toBe("anthropic");
  });

  it("defaults to OpenAI first in fallback order", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GOOGLE_AI_API_KEY = "AIza-test";
    const result = await predictEquipmentFailure(sampleRequest);
    expect(result.provider).toBe("openai");
  });

  it("clamps risk score to 0-1 range", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const result = await predictEquipmentFailure(sampleRequest);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);
  });

  it("handles empty maintenance history", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const request = {
      ...sampleRequest,
      maintenanceHistory: [],
      sensorTrends: [],
    };
    const result = await predictEquipmentFailure(request);
    expect(result.provider).toBe("openai");
    expect(result.recommendedAction).toBeTruthy();
  });
});
