import { NextRequest, NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  getOrgFeatures,
  enableFeature,
  disableFeature,
  FEATURE_KEYS,
  FEATURE_LABELS,
} from "@/lib/features";
import {
  toggleFeatureSchema,
  bulkToggleFeaturesSchema,
} from "@/lib/validations/features";
import type { FeatureKey } from "@/lib/features";

// GET: List all features for the organization
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;

  const fakeReq = new Request(request.url, {
    headers: new Headers({
      ...Object.fromEntries(request.headers.entries()),
      "x-organization-id": organizationId,
    }),
  });

  const auth = await withOrgAuth(fakeReq);
  if (auth instanceof NextResponse) return auth;

  const enabledFeatures = await getOrgFeatures(organizationId);

  // Build full feature list with enabled/disabled status
  const features = FEATURE_KEYS.map((key) => ({
    featureKey: key,
    label: FEATURE_LABELS[key],
    enabled: enabledFeatures[key]?.enabled ?? false,
    enabledAt: enabledFeatures[key]?.enabledAt ?? null,
    disabledAt: enabledFeatures[key]?.disabledAt ?? null,
    metadata: enabledFeatures[key]?.metadata ?? null,
  }));

  return NextResponse.json({ features });
}

// PUT: Toggle a single feature (admin/owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;

  const fakeReq = new Request(request.url, {
    headers: new Headers({
      ...Object.fromEntries(request.headers.entries()),
      "x-organization-id": organizationId,
    }),
  });

  const auth = await withOrgAuth(fakeReq, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = toggleFeatureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { featureKey, enabled, metadata } = parsed.data;
  const typedKey = featureKey as FeatureKey;

  if (enabled) {
    await enableFeature(organizationId, typedKey, auth.userId, metadata);
  } else {
    await disableFeature(organizationId, typedKey);
  }

  await logAudit({
    userId: auth.userId,
    organizationId,
    action: enabled ? "ENABLE_FEATURE" : "DISABLE_FEATURE",
    entityType: "organizationFeature",
    entityId: featureKey,
    details: `${enabled ? "Enabled" : "Disabled"} feature "${FEATURE_LABELS[typedKey]}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    featureKey,
    label: FEATURE_LABELS[typedKey],
    enabled,
    message: `Feature "${FEATURE_LABELS[typedKey]}" has been ${enabled ? "enabled" : "disabled"}`,
  });
}

// PATCH: Bulk toggle features (admin/owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;

  const fakeReq = new Request(request.url, {
    headers: new Headers({
      ...Object.fromEntries(request.headers.entries()),
      "x-organization-id": organizationId,
    }),
  });

  const auth = await withOrgAuth(fakeReq, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = bulkToggleFeaturesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const results = [];
  for (const { featureKey, enabled, metadata } of parsed.data.features) {
    const typedKey = featureKey as FeatureKey;
    if (enabled) {
      await enableFeature(organizationId, typedKey, auth.userId, metadata);
    } else {
      await disableFeature(organizationId, typedKey);
    }

    await logAudit({
      userId: auth.userId,
      organizationId,
      action: enabled ? "ENABLE_FEATURE" : "DISABLE_FEATURE",
      entityType: "organizationFeature",
      entityId: featureKey,
      details: `${enabled ? "Enabled" : "Disabled"} feature "${FEATURE_LABELS[typedKey]}"`,
      ipAddress: getClientIp(request),
    });

    results.push({
      featureKey,
      label: FEATURE_LABELS[typedKey],
      enabled,
    });
  }

  return NextResponse.json({
    features: results,
    message: `Updated ${results.length} feature(s)`,
  });
}
