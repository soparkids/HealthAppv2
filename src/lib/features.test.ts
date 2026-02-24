import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  hasFeature,
  getOrgFeatures,
  requireFeature,
  enableFeature,
  disableFeature,
  seedDefaultFeatures,
  FEATURE_KEYS,
  FEATURE_LABELS,
  DEFAULT_FEATURES,
} from "@/lib/features";
import type { FeatureKey } from "@/lib/features";
import {
  toggleFeatureSchema,
  bulkToggleFeaturesSchema,
} from "@/lib/validations/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Constants ───────────────────────────────────────────────

describe("Feature flag constants", () => {
  it("should define all expected feature keys", () => {
    expect(FEATURE_KEYS).toContain("eye_consultation");
    expect(FEATURE_KEYS).toContain("appointments");
    expect(FEATURE_KEYS).toContain("predictive_maintenance");
    expect(FEATURE_KEYS).toContain("ai_interpretation");
    expect(FEATURE_KEYS).toContain("family_management");
    expect(FEATURE_KEYS).toContain("report_sharing");
    expect(FEATURE_KEYS).toContain("follow_ups");
    expect(FEATURE_KEYS).toContain("provider_portal");
  });

  it("should have a label for every feature key", () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURE_LABELS[key]).toBeDefined();
      expect(typeof FEATURE_LABELS[key]).toBe("string");
      expect(FEATURE_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it("should have default features that are a subset of all feature keys", () => {
    for (const key of DEFAULT_FEATURES) {
      expect(FEATURE_KEYS).toContain(key);
    }
  });

  it("should have report_sharing, follow_ups, and family_management as defaults", () => {
    expect(DEFAULT_FEATURES).toContain("report_sharing");
    expect(DEFAULT_FEATURES).toContain("follow_ups");
    expect(DEFAULT_FEATURES).toContain("family_management");
  });
});

// ─── hasFeature ──────────────────────────────────────────────

describe("hasFeature", () => {
  it("should return true when feature is enabled", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue({
      id: "feat-1",
      organizationId: "org-1",
      featureKey: "eye_consultation",
      enabled: true,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await hasFeature("org-1", "eye_consultation");
    expect(result).toBe(true);
  });

  it("should return false when feature is disabled", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue({
      id: "feat-1",
      organizationId: "org-1",
      featureKey: "eye_consultation",
      enabled: false,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: new Date(),
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await hasFeature("org-1", "eye_consultation");
    expect(result).toBe(false);
  });

  it("should return false when feature record does not exist", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue(null);

    const result = await hasFeature("org-1", "appointments");
    expect(result).toBe(false);
  });

  it("should query with correct composite key", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue(null);

    await hasFeature("org-abc", "ai_interpretation");

    expect(mockPrisma.organizationFeature.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_featureKey: {
          organizationId: "org-abc",
          featureKey: "ai_interpretation",
        },
      },
    });
  });
});

// ─── getOrgFeatures ──────────────────────────────────────────

describe("getOrgFeatures", () => {
  it("should return a map of all features for an org", async () => {
    const now = new Date();
    mockPrisma.organizationFeature.findMany.mockResolvedValue([
      {
        id: "f1",
        organizationId: "org-1",
        featureKey: "report_sharing",
        enabled: true,
        enabledAt: now,
        enabledBy: "user-1",
        disabledAt: null,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "f2",
        organizationId: "org-1",
        featureKey: "eye_consultation",
        enabled: false,
        enabledAt: now,
        enabledBy: "user-1",
        disabledAt: now,
        metadata: '{"maxPatients": 100}',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await getOrgFeatures("org-1");

    expect(result["report_sharing"]).toEqual({
      enabled: true,
      enabledAt: now,
      disabledAt: null,
      metadata: null,
    });
    expect(result["eye_consultation"]).toEqual({
      enabled: false,
      enabledAt: now,
      disabledAt: now,
      metadata: '{"maxPatients": 100}',
    });
  });

  it("should return empty map when org has no features", async () => {
    mockPrisma.organizationFeature.findMany.mockResolvedValue([]);
    const result = await getOrgFeatures("org-empty");
    expect(result).toEqual({});
  });
});

// ─── requireFeature ──────────────────────────────────────────

describe("requireFeature", () => {
  it("should return null when feature is enabled", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue({
      id: "f1",
      organizationId: "org-1",
      featureKey: "report_sharing",
      enabled: true,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await requireFeature("org-1", "report_sharing");
    expect(result).toBeNull();
  });

  it("should return 403 response when feature is disabled", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue({
      id: "f1",
      organizationId: "org-1",
      featureKey: "eye_consultation",
      enabled: false,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: new Date(),
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await requireFeature("org-1", "eye_consultation");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);

    const body = await result!.json();
    expect(body.error).toBe("Feature not available");
    expect(body.feature).toBe("eye_consultation");
  });

  it("should return 403 response when feature record does not exist", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue(null);

    const result = await requireFeature("org-1", "predictive_maintenance");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("should include human-readable label in error message", async () => {
    mockPrisma.organizationFeature.findUnique.mockResolvedValue(null);

    const result = await requireFeature("org-1", "ai_interpretation");
    const body = await result!.json();
    expect(body.message).toContain("AI Report Interpretation");
  });
});

// ─── enableFeature ───────────────────────────────────────────

describe("enableFeature", () => {
  it("should upsert with enabled=true", async () => {
    mockPrisma.organizationFeature.upsert.mockResolvedValue({
      id: "f1",
      organizationId: "org-1",
      featureKey: "appointments",
      enabled: true,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await enableFeature("org-1", "appointments", "user-1");

    expect(mockPrisma.organizationFeature.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_featureKey: {
          organizationId: "org-1",
          featureKey: "appointments",
        },
      },
      update: expect.objectContaining({
        enabled: true,
        enabledBy: "user-1",
        disabledAt: null,
      }),
      create: expect.objectContaining({
        organizationId: "org-1",
        featureKey: "appointments",
        enabled: true,
        enabledBy: "user-1",
      }),
    });
  });

  it("should pass metadata when provided", async () => {
    mockPrisma.organizationFeature.upsert.mockResolvedValue({
      id: "f1",
      organizationId: "org-1",
      featureKey: "ai_interpretation",
      enabled: true,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: null,
      metadata: '{"model": "gpt-4"}',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await enableFeature("org-1", "ai_interpretation", "user-1", '{"model": "gpt-4"}');

    expect(mockPrisma.organizationFeature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ metadata: '{"model": "gpt-4"}' }),
        create: expect.objectContaining({ metadata: '{"model": "gpt-4"}' }),
      })
    );
  });
});

// ─── disableFeature ──────────────────────────────────────────

describe("disableFeature", () => {
  it("should upsert with enabled=false and set disabledAt", async () => {
    mockPrisma.organizationFeature.upsert.mockResolvedValue({
      id: "f1",
      organizationId: "org-1",
      featureKey: "eye_consultation",
      enabled: false,
      enabledAt: new Date(),
      enabledBy: null,
      disabledAt: new Date(),
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await disableFeature("org-1", "eye_consultation");

    expect(mockPrisma.organizationFeature.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_featureKey: {
          organizationId: "org-1",
          featureKey: "eye_consultation",
        },
      },
      update: expect.objectContaining({
        enabled: false,
      }),
      create: expect.objectContaining({
        organizationId: "org-1",
        featureKey: "eye_consultation",
        enabled: false,
      }),
    });
  });
});

// ─── seedDefaultFeatures ─────────────────────────────────────

describe("seedDefaultFeatures", () => {
  it("should create default features in a transaction", async () => {
    mockPrisma.$transaction.mockResolvedValue([]);

    await seedDefaultFeatures("org-new", "user-1");

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const transactionArg = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
    // Should create one record per default feature
    expect(transactionArg.length).toBe(DEFAULT_FEATURES.length);
  });

  it("should call prisma.organizationFeature.create for each default feature", async () => {
    mockPrisma.organizationFeature.create.mockResolvedValue({
      id: "f1",
      organizationId: "org-new",
      featureKey: "report_sharing",
      enabled: true,
      enabledAt: new Date(),
      enabledBy: "user-1",
      disabledAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.$transaction.mockImplementation((ops: unknown[]) => Promise.resolve(ops));

    await seedDefaultFeatures("org-new", "user-1");

    // Each default feature should result in a create call
    expect(mockPrisma.organizationFeature.create).toHaveBeenCalledTimes(
      DEFAULT_FEATURES.length
    );

    for (const key of DEFAULT_FEATURES) {
      expect(mockPrisma.organizationFeature.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-new",
          featureKey: key,
          enabled: true,
          enabledBy: "user-1",
        },
      });
    }
  });
});

// ─── Validation schemas ──────────────────────────────────────

describe("Feature validation schemas", () => {
  describe("toggleFeatureSchema", () => {
    it("should accept a valid feature toggle", () => {
      const result = toggleFeatureSchema.safeParse({
        featureKey: "eye_consultation",
        enabled: true,
      });
      expect(result.success).toBe(true);
    });

    it("should accept with optional metadata", () => {
      const result = toggleFeatureSchema.safeParse({
        featureKey: "ai_interpretation",
        enabled: true,
        metadata: '{"model": "gpt-4"}',
      });
      expect(result.success).toBe(true);
    });

    it("should reject an invalid feature key", () => {
      const result = toggleFeatureSchema.safeParse({
        featureKey: "nonexistent_feature",
        enabled: true,
      });
      expect(result.success).toBe(false);
    });

    it("should reject when enabled is missing", () => {
      const result = toggleFeatureSchema.safeParse({
        featureKey: "appointments",
      });
      expect(result.success).toBe(false);
    });

    it("should reject when featureKey is missing", () => {
      const result = toggleFeatureSchema.safeParse({
        enabled: true,
      });
      expect(result.success).toBe(false);
    });

    it("should accept all valid feature keys", () => {
      for (const key of FEATURE_KEYS) {
        const result = toggleFeatureSchema.safeParse({
          featureKey: key,
          enabled: false,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("bulkToggleFeaturesSchema", () => {
    it("should accept a valid bulk toggle", () => {
      const result = bulkToggleFeaturesSchema.safeParse({
        features: [
          { featureKey: "eye_consultation", enabled: true },
          { featureKey: "appointments", enabled: false },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty features array", () => {
      const result = bulkToggleFeaturesSchema.safeParse({
        features: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject when features array contains invalid keys", () => {
      const result = bulkToggleFeaturesSchema.safeParse({
        features: [
          { featureKey: "invalid_key", enabled: true },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
