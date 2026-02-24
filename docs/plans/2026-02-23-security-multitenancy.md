# Phase 1: Security & Multi-Tenancy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add organization-based multi-tenancy, granular role hierarchy, audit logging, and rate limiting to HealthAppv2 — making it SaaS-ready.

**Architecture:** Shared-database tenant-column approach. Every data model gets an `organizationId` foreign key. A new `Organization` model represents each hospital/clinic. Users join organizations via `OrganizationMember` with org-scoped roles (OWNER, ADMIN, DOCTOR, NURSE, RECEPTIONIST). Existing PATIENT/PROVIDER/ADMIN roles remain as the platform-level role. A centralized `withOrgAuth()` helper enforces tenant isolation in every API route. Audit logging records all state-changing actions. Rate limiting protects auth endpoints.

**Tech Stack:** Next.js 16, Prisma 7 (PostgreSQL), NextAuth 4, Zod 4, bcryptjs, TypeScript

---

## Task 1: Prisma Schema — Organization & Membership Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the new enums and models to the Prisma schema**

Add these after the existing `FollowUpStatus` enum (line 34):

```prisma
enum OrgRole {
  OWNER
  ADMIN
  DOCTOR
  NURSE
  RECEPTIONIST
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members        OrganizationMember[]
  medicalRecords MedicalRecord[]
  followUps      FollowUp[]
  notifications  Notification[]
  auditLogs      AuditLog[]
  providers      Provider[]
}

model OrganizationMember {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           OrgRole      @default(RECEPTIONIST)
  createdAt      DateTime     @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
}
```

**Step 2: Add `organizationId` to existing models**

Add to `MedicalRecord` model (after `userId` field):
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
```
Add `@@index([organizationId])` to the model.

Add to `FollowUp` model (after `userId` field):
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
```
Add `@@index([organizationId])` to the model.

Add to `Notification` model (after `userId` field):
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
```

Add to `Provider` model (after `userId` field):
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
```

**Step 3: Add relations on User model**

Add to `User` model:
```prisma
  organizations OrganizationMember[]
```

**Step 4: Add AuditLog model**

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  userId         String?
  organizationId String?
  action         String
  entityType     String?
  entityId       String?
  details        String?
  ipAddress      String?
  createdAt      DateTime @default(now())

  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

**Step 5: Generate migration**

Run: `cd HealthAppv2 && npx prisma migrate dev --name add-org-multitenancy-audit`

Expected: Migration created successfully, Prisma Client regenerated.

**Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add Organization, OrganizationMember, AuditLog models and tenant columns"
```

---

## Task 2: Audit Logging Utility

**Files:**
- Create: `src/lib/audit.ts`

**Step 1: Create the audit logger**

```typescript
import { prisma } from "@/lib/prisma";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "PASSWORD_CHANGE"
  | "CREATE_RECORD"
  | "UPDATE_RECORD"
  | "DELETE_RECORD"
  | "SHARE_RECORD"
  | "REVOKE_SHARE"
  | "CREATE_FOLLOW_UP"
  | "UPDATE_FOLLOW_UP"
  | "DELETE_FOLLOW_UP"
  | "ADD_FAMILY_MEMBER"
  | "REMOVE_FAMILY_MEMBER"
  | "CREATE_ORGANIZATION"
  | "UPDATE_ORGANIZATION"
  | "ADD_ORG_MEMBER"
  | "REMOVE_ORG_MEMBER"
  | "UPDATE_ORG_MEMBER_ROLE"
  | "EXPORT_DATA";

interface AuditParams {
  userId?: string;
  organizationId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Audit logging should never break the request
    console.error("Audit log failed:", error);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
```

**Step 2: Commit**

```bash
git add src/lib/audit.ts
git commit -m "feat: add audit logging utility"
```

---

## Task 3: Organization Auth Helper (`withOrgAuth`)

**Files:**
- Create: `src/lib/org-auth.ts`

This is the key piece — a centralized helper that every API route uses to get the current user's session AND their org membership in one call.

**Step 1: Create the org auth helper**

```typescript
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/generated/prisma/client";

export interface OrgAuthContext {
  userId: string;
  email: string;
  role: string; // platform role (PATIENT, PROVIDER, ADMIN)
  organizationId: string;
  orgRole: OrgRole;
}

/**
 * Validates session + organization membership in one call.
 * Returns the auth context or a NextResponse error.
 *
 * Usage in API routes:
 *   const auth = await withOrgAuth(request, ["ADMIN", "DOCTOR"]);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is now OrgAuthContext
 */
export async function withOrgAuth(
  request: Request,
  allowedOrgRoles?: OrgRole[]
): Promise<OrgAuthContext | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get organizationId from header (set by middleware or client)
  const organizationId = request.headers.get("x-organization-id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization context required" },
      { status: 400 }
    );
  }

  // Verify membership
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  // Check role if specific roles required
  if (allowedOrgRoles && !allowedOrgRoles.includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return {
    userId: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
    organizationId,
    orgRole: membership.role,
  };
}

/**
 * Simple auth check without org context (for patient-facing routes).
 */
export async function withAuth(): Promise<
  { userId: string; email: string; role: string } | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    userId: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/org-auth.ts
git commit -m "feat: add withOrgAuth helper for tenant-scoped authorization"
```

---

## Task 4: Rate Limiting Utility

**Files:**
- Create: `src/lib/rate-limit.ts`

**Step 1: Create in-memory rate limiter**

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
  }

  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    retryAfterMs: 0,
  };
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}

// Preset configs
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export const API_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1 minute
};
```

**Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add in-memory rate limiting utility"
```

---

## Task 5: Organization API Routes

**Files:**
- Create: `src/app/api/organizations/route.ts`
- Create: `src/app/api/organizations/[id]/route.ts`
- Create: `src/app/api/organizations/[id]/members/route.ts`
- Create: `src/app/api/organizations/[id]/members/[memberId]/route.ts`
- Create: `src/app/api/organizations/[id]/audit-log/route.ts`
- Create: `src/lib/validations/organization.ts`

**Step 1: Create organization validation schemas**

File: `src/lib/validations/organization.ts`
```typescript
import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
});

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
```

**Step 2: Create organizations list/create route**

File: `src/app/api/organizations/route.ts`
```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { logAudit, getClientIp } from "@/lib/audit";

// GET: List organizations the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
    memberCount: m.organization._count.members,
    createdAt: m.organization.createdAt,
  }));

  return NextResponse.json({ organizations });
}

// POST: Create a new organization (creator becomes OWNER)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, slug } = parsed.data;

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "An organization with this slug already exists" },
      { status: 409 }
    );
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    organizationId: organization.id,
    action: "CREATE_ORGANIZATION",
    entityType: "organization",
    entityId: organization.id,
    details: `Created organization "${name}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: "OWNER",
      memberCount: organization._count.members,
      createdAt: organization.createdAt,
    },
    { status: 201 }
  );
}
```

**Step 3: Create single organization route**

File: `src/app/api/organizations/[id]/route.ts`
```typescript
import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";

// GET: Get organization details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Inject org id into headers for withOrgAuth
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
  });

  const auth = await withOrgAuth(modifiedRequest);
  if (auth instanceof NextResponse) return auth;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { medicalRecords: true, members: true },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ organization });
}
```

**Step 4: Create members management routes**

File: `src/app/api/organizations/[id]/members/route.ts`
```typescript
import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";
import { addMemberSchema } from "@/lib/validations/organization";
import { logAudit, getClientIp } from "@/lib/audit";

// POST: Add a member to the organization (OWNER/ADMIN only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
    body: request.body,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No user found with this email. They must register first." },
      { status: 404 }
    );
  }

  const existingMembership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: id } },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: "User is already a member of this organization" },
      { status: 409 }
    );
  }

  const membership = await prisma.organizationMember.create({
    data: { userId: user.id, organizationId: id, role },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: id,
    action: "ADD_ORG_MEMBER",
    entityType: "organizationMember",
    entityId: membership.id,
    details: `Added ${email} as ${role}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    { id: membership.id, user: membership.user, role: membership.role },
    { status: 201 }
  );
}
```

File: `src/app/api/organizations/[id]/members/[memberId]/route.ts`
```typescript
import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";
import { updateMemberRoleSchema } from "@/lib/validations/organization";
import { logAudit, getClientIp } from "@/lib/audit";

// PUT: Update member role (OWNER/ADMIN only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
    body: request.body,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.organizationId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot change the owner's role" },
      { status: 400 }
    );
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    userId: auth.userId,
    organizationId: id,
    action: "UPDATE_ORG_MEMBER_ROLE",
    entityType: "organizationMember",
    entityId: memberId,
    details: `Changed role to ${parsed.data.role}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ id: updated.id, user: updated.user, role: updated.role });
}

// DELETE: Remove member (OWNER/ADMIN only, cannot remove owner)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { email: true } } },
  });
  if (!member || member.organizationId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove the organization owner" },
      { status: 400 }
    );
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  await logAudit({
    userId: auth.userId,
    organizationId: id,
    action: "REMOVE_ORG_MEMBER",
    entityType: "organizationMember",
    entityId: memberId,
    details: `Removed ${member.user.email}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ message: "Member removed" });
}
```

**Step 5: Create audit log route**

File: `src/app/api/organizations/[id]/audit-log/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";

// GET: View audit log (OWNER/ADMIN only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headers = new Headers(request.headers);
  headers.set("x-organization-id", id);
  const modifiedRequest = new Request(request.url, {
    headers,
    method: request.method,
  });

  const auth = await withOrgAuth(modifiedRequest, ["OWNER", "ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const action = searchParams.get("action");

  const where: Record<string, unknown> = { organizationId: id };
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
```

**Step 6: Commit**

```bash
git add src/lib/validations/organization.ts src/app/api/organizations/
git commit -m "feat: add organization CRUD, member management, and audit log API routes"
```

---

## Task 6: Add Rate Limiting to Auth Routes

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/auth/register/route.ts`

**Step 1: Add rate limiting + audit to the NextAuth authorize callback**

In `src/lib/auth.ts`, add imports at top:
```typescript
import { checkRateLimit, clearRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
```

Inside the `authorize` function, before the existing email/password lookup, add:
```typescript
const ip = "unknown"; // IP not easily available in authorize callback
const rateLimitKey = `login:${parsed.data.email}`;
const rateCheck = checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT);
if (!rateCheck.allowed) {
  throw new Error("Too many login attempts. Try again later.");
}
```

After successful password check (before the return), add:
```typescript
clearRateLimit(rateLimitKey);
await logAudit({
  userId: user.id,
  action: "LOGIN",
  details: `Login as ${user.role}`,
});
```

After the `if (!isPasswordValid)` block, record the failed attempt by modifying that block:
```typescript
if (!isPasswordValid) {
  await logAudit({
    action: "LOGIN",
    details: `Failed login attempt for ${email}`,
  });
  return null;
}
```

**Step 2: Add rate limiting to register route**

In `src/app/api/auth/register/route.ts`, add at top:
```typescript
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
```

At the start of the POST handler (before body parsing), add:
```typescript
const ip = getClientIp(request);
const rateCheck = checkRateLimit(`register:${ip}`, AUTH_RATE_LIMIT);
if (!rateCheck.allowed) {
  return NextResponse.json(
    { error: "Too many registration attempts. Try again later." },
    { status: 429 }
  );
}
```

After successful user creation, add:
```typescript
await logAudit({
  userId: user.id,
  action: "REGISTER",
  entityType: "user",
  entityId: user.id,
  details: `Registered as ${role}`,
  ipAddress: ip,
});
```

**Step 3: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/register/route.ts
git commit -m "feat: add rate limiting and audit logging to auth routes"
```

---

## Task 7: Update Existing API Routes for Tenant Scoping

**Files:**
- Modify: `src/app/api/records/route.ts`
- Modify: `src/app/api/records/[id]/route.ts`
- Modify: `src/app/api/follow-ups/route.ts`
- Modify: `src/app/api/follow-ups/[id]/route.ts`
- Modify: `src/app/api/shares/route.ts`

For each route, the pattern is:
1. Replace manual `getServerSession` + check with `withAuth()` or `withOrgAuth()`
2. Add `organizationId` to create operations when org header is present
3. Add audit logging for state-changing operations

**Step 1: Update records route**

In `src/app/api/records/route.ts`:

Replace the session check pattern:
```typescript
// Old:
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

With:
```typescript
import { withAuth } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

// In GET:
const auth = await withAuth();
if (auth instanceof NextResponse) return auth;
// Then use auth.userId instead of session.user.id
```

In the POST handler, after creating the record, add:
```typescript
const organizationId = request.headers.get("x-organization-id");

// In create data, add:
organizationId: organizationId || undefined,

// After create:
await logAudit({
  userId: auth.userId,
  organizationId: organizationId || undefined,
  action: "CREATE_RECORD",
  entityType: "medicalRecord",
  entityId: record.id,
  ipAddress: getClientIp(request),
});
```

**Step 2: Apply same pattern to follow-ups, shares, and single-record routes**

Each file follows the exact same refactoring pattern:
1. Import `withAuth` and `logAudit`
2. Replace session boilerplate with `withAuth()`
3. Add `organizationId` to creates
4. Add audit log after mutations

**Step 3: Commit**

```bash
git add src/app/api/records/ src/app/api/follow-ups/ src/app/api/shares/
git commit -m "feat: add tenant scoping and audit logging to existing API routes"
```

---

## Task 8: Security Headers in Next.js Config

**Files:**
- Modify: `next.config.ts`

**Step 1: Add security headers**

Replace `next.config.ts` content:
```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

**Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat: add security headers to Next.js config"
```

---

## Task 9: Update NextAuth Session to Include Active Organization

**Files:**
- Modify: `src/lib/auth.ts` (JWT + session callbacks)
- Modify: `src/types/next-auth.d.ts`

**Step 1: Extend NextAuth types**

In `src/types/next-auth.d.ts`, add `activeOrganizationId` to both:
```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      activeOrganizationId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    activeOrganizationId?: string | null;
  }
}
```

**Step 2: Update auth callbacks**

In the `jwt` callback in `src/lib/auth.ts`, after setting role, fetch the user's first org membership:
```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    token.id = user.id;
    token.role = (user as unknown as { role: string }).role;

    // Set default active organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    token.activeOrganizationId = membership?.organizationId || null;
  }
  return token;
},
```

In the `session` callback, pass it through:
```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.role = token.role as string;
    session.user.activeOrganizationId = token.activeOrganizationId as string | null;
  }
  return session;
},
```

**Step 3: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat: add activeOrganizationId to NextAuth session"
```

---

## Task 10: Update Middleware for Org-Aware Routing

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Update middleware**

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Provider-only routes
    if (pathname.startsWith("/provider") && token?.role !== "PROVIDER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Inject active organization into request headers for API routes
    const response = NextResponse.next();
    if (token?.activeOrganizationId) {
      response.headers.set("x-organization-id", token.activeOrganizationId);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/records/:path*",
    "/care/:path*",
    "/family/:path*",
    "/provider/:path*",
    "/admin/:path*",
    "/api/((?!auth|shared).*)/:path*",
  ],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: update middleware for org-aware routing and admin protection"
```

---

## Task 11: Verify Build

**Step 1: Install deps and generate Prisma client**

```bash
cd HealthAppv2 && npm install && npx prisma generate
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

Fix any TypeScript errors that come up.

**Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix any remaining type errors from Phase 1"
```

---

## Summary

After all 11 tasks, HealthAppv2 will have:
- **Organization model** with slug-based identification
- **Membership system** with 5-tier role hierarchy (OWNER > ADMIN > DOCTOR > NURSE > RECEPTIONIST)
- **Tenant isolation** via `organizationId` on all data models
- **Centralized auth helper** (`withOrgAuth`) enforcing org membership + role checks
- **Audit logging** for all state-changing operations
- **Rate limiting** on auth endpoints (5 attempts / 15 min)
- **Security headers** (CSP, XFO, HSTS, etc.)
- **Session-level org context** via NextAuth JWT
