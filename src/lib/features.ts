import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * All available feature keys in the system.
 * Add new features here as modules are built.
 */
export const FEATURE_KEYS = [
  "eye_consultation",
  "appointments",
  "predictive_maintenance",
  "ai_interpretation",
  "family_management",
  "report_sharing",
  "follow_ups",
  "provider_portal",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Human-readable labels for features */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  eye_consultation: "Eye Consultation",
  appointments: "Appointments",
  predictive_maintenance: "Predictive Maintenance",
  ai_interpretation: "AI Report Interpretation",
  family_management: "Family Management",
  report_sharing: "Report Sharing",
  follow_ups: "Follow-Ups",
  provider_portal: "Provider Portal",
};

/** Features enabled by default for new organizations */
export const DEFAULT_FEATURES: FeatureKey[] = [
  "report_sharing",
  "follow_ups",
  "family_management",
];

/**
 * Check if an organization has a specific feature enabled.
 */
export async function hasFeature(
  organizationId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const feature = await prisma.organizationFeature.findUnique({
    where: {
      organizationId_featureKey: {
        organizationId,
        featureKey,
      },
    },
  });
  return feature?.enabled ?? false;
}

/**
 * Get all features for an organization, including disabled ones.
 * Returns a map of featureKey -> { enabled, enabledAt, metadata }
 */
export async function getOrgFeatures(organizationId: string) {
  const features = await prisma.organizationFeature.findMany({
    where: { organizationId },
    orderBy: { featureKey: "asc" },
  });

  const featureMap: Record<
    string,
    { enabled: boolean; enabledAt: Date; disabledAt: Date | null; metadata: string | null }
  > = {};

  for (const f of features) {
    featureMap[f.featureKey] = {
      enabled: f.enabled,
      enabledAt: f.enabledAt,
      disabledAt: f.disabledAt,
      metadata: f.metadata,
    };
  }

  return featureMap;
}

/**
 * Middleware-style feature gate for API routes.
 * Returns null if the feature is enabled, or a 403 NextResponse if not.
 */
export async function requireFeature(
  organizationId: string,
  featureKey: FeatureKey
): Promise<NextResponse | null> {
  const enabled = await hasFeature(organizationId, featureKey);
  if (!enabled) {
    return NextResponse.json(
      {
        error: "Feature not available",
        feature: featureKey,
        message: `The "${FEATURE_LABELS[featureKey]}" feature is not enabled for this organization. Contact your administrator to enable it.`,
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Enable a feature for an organization. Creates the record if it doesn't exist.
 */
export async function enableFeature(
  organizationId: string,
  featureKey: FeatureKey,
  enabledBy: string,
  metadata?: string
) {
  return prisma.organizationFeature.upsert({
    where: {
      organizationId_featureKey: { organizationId, featureKey },
    },
    update: {
      enabled: true,
      enabledAt: new Date(),
      enabledBy,
      disabledAt: null,
      metadata: metadata ?? undefined,
    },
    create: {
      organizationId,
      featureKey,
      enabled: true,
      enabledBy,
      metadata: metadata ?? null,
    },
  });
}

/**
 * Disable a feature for an organization.
 */
export async function disableFeature(
  organizationId: string,
  featureKey: FeatureKey
) {
  return prisma.organizationFeature.upsert({
    where: {
      organizationId_featureKey: { organizationId, featureKey },
    },
    update: {
      enabled: false,
      disabledAt: new Date(),
    },
    create: {
      organizationId,
      featureKey,
      enabled: false,
      disabledAt: new Date(),
    },
  });
}

/**
 * Seed default features for a new organization.
 */
export async function seedDefaultFeatures(
  organizationId: string,
  enabledBy: string
) {
  const operations = DEFAULT_FEATURES.map((featureKey) =>
    prisma.organizationFeature.create({
      data: {
        organizationId,
        featureKey,
        enabled: true,
        enabledBy,
      },
    })
  );
  return prisma.$transaction(operations);
}
