import { z } from "zod";
import { FEATURE_KEYS } from "@/lib/features";

export const featureKeySchema = z.enum(FEATURE_KEYS as unknown as [string, ...string[]]);

export const toggleFeatureSchema = z.object({
  featureKey: featureKeySchema,
  enabled: z.boolean(),
  metadata: z.string().optional(),
});

export const bulkToggleFeaturesSchema = z.object({
  features: z
    .array(
      z.object({
        featureKey: featureKeySchema,
        enabled: z.boolean(),
        metadata: z.string().optional(),
      })
    )
    .min(1, "At least one feature is required"),
});

export type ToggleFeatureInput = z.infer<typeof toggleFeatureSchema>;
export type BulkToggleFeaturesInput = z.infer<typeof bulkToggleFeaturesSchema>;
