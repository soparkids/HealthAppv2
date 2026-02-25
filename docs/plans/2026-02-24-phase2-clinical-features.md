# Phase 2: Clinical Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Patient model (separate from User, with account linking), Appointments, Eye Consultations, Medical History (immutable append-only), and Lab Results — all feature-flagged, org-scoped, audit-logged, and tested.

**Architecture:** Hospital staff manage Patient records through org-scoped routes (`withOrgAuth`). Patients can optionally link their User account to their Patient record for self-service access. All clinical features (appointments, eye consultations, medical history, lab results) hang off the Patient model, are gated by feature flags, and produce audit trail entries. The immutable medical history uses an append-only pattern with dual-write to keep current snapshot on Patient and full history in MedicalHistory.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7 (PostgreSQL), Zod 4, Vitest 4, NextAuth 4

---

## Task 1: Prisma Schema — New Models & Enums

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add new enums to schema**

Add after the existing `OrgRole` enum:

```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

**Step 2: Add Patient model**

Add after the User model:

```prisma
model Patient {
  id                String    @id @default(cuid())
  organizationId    String
  linkedUserId      String?   // optional link to a User account for self-service
  patientNumber     String    // org-scoped patient ID like "P0001"
  firstName         String
  lastName          String
  dateOfBirth       DateTime
  gender            Gender
  phone             String?
  email             String?
  address           String?
  emergencyContact  String?
  emergencyPhone    String?
  allergies         String?
  medicalConditions String?
  medications       String?
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization      Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  linkedUser        User?              @relation(fields: [linkedUserId], references: [id], onDelete: SetNull)
  appointments      Appointment[]
  eyeConsultations  EyeConsultation[]
  medicalHistories  MedicalHistory[]
  labResults        LabResult[]

  @@unique([organizationId, patientNumber])
  @@index([organizationId])
  @@index([linkedUserId])
  @@index([lastName, firstName])
}
```

**Step 3: Add Appointment model**

```prisma
model Appointment {
  id               String            @id @default(cuid())
  organizationId   String
  patientId        String
  appointmentDate  DateTime
  appointmentTime  String            // HH:MM format
  doctor           String
  reason           String?
  status           AppointmentStatus @default(SCHEDULED)
  notes            String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient      Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([patientId])
  @@index([appointmentDate])
  @@index([status])
}
```

**Step 4: Add EyeConsultation model**

```prisma
model EyeConsultation {
  id               String   @id @default(cuid())
  organizationId   String
  patientId        String
  consultationDate DateTime
  doctor           String
  chiefComplaint   String?
  // 12 bilateral examination fields (Right Eye / Left Eye)
  reMovement       String?
  leMovement       String?
  reLids           String?
  leLids           String?
  reGlobe          String?
  leGlobe          String?
  reConjunctiva    String?
  leConjunctiva    String?
  reCornea         String?
  leCornea         String?
  reAc             String?
  leAc             String?
  rePupil          String?
  lePupil          String?
  reIris           String?
  leIris           String?
  reLens           String?
  leLens           String?
  reVrr            String?
  leVrr            String?
  reVcdr           String?
  leVcdr           String?
  reOthers         String?
  leOthers         String?
  diagnosis        String?
  plan             String?
  createdAt        DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient      Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([patientId])
  @@index([consultationDate])
}
```

**Step 5: Add MedicalHistory model (immutable — no updatedAt)**

```prisma
model MedicalHistory {
  id                String   @id @default(cuid())
  organizationId    String
  patientId         String
  medicalConditions String?
  medications       String?
  notes             String?
  createdAt         DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient      Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([patientId])
  @@index([createdAt])
}
```

**Step 6: Add LabResult model**

```prisma
model LabResult {
  id             String   @id @default(cuid())
  organizationId String
  patientId      String
  testName       String
  resultValue    String
  datePerformed  DateTime
  notes          String?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient      Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([patientId])
  @@index([datePerformed])
}
```

**Step 7: Add relations to existing models**

Add to the `User` model:

```prisma
  linkedPatients Patient[]
```

Add to the `Organization` model:

```prisma
  patients          Patient[]
  appointments      Appointment[]
  eyeConsultations  EyeConsultation[]
  medicalHistories  MedicalHistory[]
  labResults        LabResult[]
```

**Step 8: Generate Prisma client**

Run: `cd C:/Users/okenw/.openclaw/workspace/HealthAppv2 && npx prisma generate`
Expected: "Generated Prisma Client"

**Step 9: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Patient, Appointment, EyeConsultation, MedicalHistory, LabResult models"
```

---

## Task 2: Update Feature Flags & Audit Actions

**Files:**
- Modify: `src/lib/features.ts`
- Modify: `src/lib/audit.ts`

**Step 1: Add new feature keys**

In `src/lib/features.ts`, add `"lab_results"` and `"medical_history"` to `FEATURE_KEYS`:

```typescript
export const FEATURE_KEYS = [
  "eye_consultation",
  "appointments",
  "predictive_maintenance",
  "ai_interpretation",
  "family_management",
  "report_sharing",
  "follow_ups",
  "provider_portal",
  "lab_results",
  "medical_history",
] as const;
```

Add labels:

```typescript
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  eye_consultation: "Eye Consultation",
  appointments: "Appointments",
  predictive_maintenance: "Predictive Maintenance",
  ai_interpretation: "AI Report Interpretation",
  family_management: "Family Management",
  report_sharing: "Report Sharing",
  follow_ups: "Follow-Ups",
  provider_portal: "Provider Portal",
  lab_results: "Lab Results",
  medical_history: "Medical History",
};
```

**Step 2: Add new audit actions**

In `src/lib/audit.ts`, extend the `AuditAction` type:

```typescript
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
  | "ENABLE_FEATURE"
  | "DISABLE_FEATURE"
  | "UPDATE_FEATURE"
  | "EXPORT_DATA"
  // Phase 2: Clinical features
  | "CREATE_PATIENT"
  | "UPDATE_PATIENT"
  | "DELETE_PATIENT"
  | "LINK_PATIENT_ACCOUNT"
  | "CREATE_APPOINTMENT"
  | "UPDATE_APPOINTMENT"
  | "DELETE_APPOINTMENT"
  | "CREATE_EYE_CONSULTATION"
  | "DELETE_EYE_CONSULTATION"
  | "CREATE_MEDICAL_HISTORY"
  | "CREATE_LAB_RESULT"
  | "DELETE_LAB_RESULT";
```

**Step 3: Commit**

```bash
git add src/lib/features.ts src/lib/audit.ts
git commit -m "feat: add clinical feature flags and audit actions"
```

---

## Task 3: Update Test Setup

**Files:**
- Modify: `src/__tests__/setup.ts`

**Step 1: Add new Prisma model mocks to setup**

Add mocks for the new models:

```typescript
patient: {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
},
appointment: {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
},
eyeConsultation: {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  delete: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
},
medicalHistory: {
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
},
labResult: {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  delete: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
},
```

**Step 2: Run existing tests to confirm nothing breaks**

Run: `npm test`
Expected: All 96 existing tests pass

**Step 3: Commit**

```bash
git add src/__tests__/setup.ts
git commit -m "test: add Prisma mocks for clinical models"
```

---

## Task 4: Validation Schemas for Clinical Features

**Files:**
- Create: `src/lib/validations/clinical.ts`
- Modify: `src/lib/validations/index.ts`
- Test: `src/lib/validations/clinical.test.ts`

**Step 1: Write failing tests for validation schemas**

Create `src/lib/validations/clinical.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createPatientSchema,
  updatePatientSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  createEyeConsultationSchema,
  createMedicalHistorySchema,
  createLabResultSchema,
} from "@/lib/validations/clinical";

describe("Patient Schemas", () => {
  describe("createPatientSchema", () => {
    it("accepts valid patient data", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        gender: "MALE",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full patient data with optional fields", () => {
      const result = createPatientSchema.safeParse({
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: "1985-06-20",
        gender: "FEMALE",
        phone: "+1-555-0123",
        email: "jane@example.com",
        address: "123 Main St",
        emergencyContact: "John Smith",
        emergencyPhone: "555-0124",
        allergies: "Penicillin",
        medicalConditions: "Type 2 Diabetes",
        medications: "Metformin 500mg",
        notes: "Referred by Dr. Brown",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing firstName", () => {
      const result = createPatientSchema.safeParse({
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        gender: "MALE",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing lastName", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        dateOfBirth: "1990-01-15",
        gender: "MALE",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing dateOfBirth", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        gender: "MALE",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid gender", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        gender: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        gender: "MALE",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updatePatientSchema", () => {
    it("accepts partial updates", () => {
      const result = updatePatientSchema.safeParse({
        phone: "555-0123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (no changes)", () => {
      const result = updatePatientSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe("Appointment Schemas", () => {
  describe("createAppointmentSchema", () => {
    it("accepts valid appointment", () => {
      const result = createAppointmentSchema.safeParse({
        patientId: "patient-123",
        appointmentDate: "2026-03-15",
        appointmentTime: "14:30",
        doctor: "Dr. Smith",
      });
      expect(result.success).toBe(true);
    });

    it("accepts appointment with optional fields", () => {
      const result = createAppointmentSchema.safeParse({
        patientId: "patient-123",
        appointmentDate: "2026-03-15",
        appointmentTime: "09:00",
        doctor: "Dr. Smith",
        reason: "Annual checkup",
        notes: "Patient prefers morning",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing doctor", () => {
      const result = createAppointmentSchema.safeParse({
        patientId: "patient-123",
        appointmentDate: "2026-03-15",
        appointmentTime: "14:30",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid time format", () => {
      const result = createAppointmentSchema.safeParse({
        patientId: "patient-123",
        appointmentDate: "2026-03-15",
        appointmentTime: "2:30 PM",
        doctor: "Dr. Smith",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateAppointmentStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateAppointmentStatusSchema.safeParse({
        status: "COMPLETED",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateAppointmentStatusSchema.safeParse({
        status: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid statuses", () => {
      for (const status of ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]) {
        const result = updateAppointmentStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe("Eye Consultation Schema", () => {
  it("accepts valid consultation", () => {
    const result = createEyeConsultationSchema.safeParse({
      patientId: "patient-123",
      consultationDate: "2026-03-15",
      doctor: "Dr. Johnson",
    });
    expect(result.success).toBe(true);
  });

  it("accepts consultation with all exam fields", () => {
    const result = createEyeConsultationSchema.safeParse({
      patientId: "patient-123",
      consultationDate: "2026-03-15",
      doctor: "Dr. Johnson",
      chiefComplaint: "Blurred vision",
      reMovement: "Full",
      leMovement: "Full",
      reLids: "Normal",
      leLids: "Normal",
      reGlobe: "Normal",
      leGlobe: "Normal",
      reConjunctiva: "Clear",
      leConjunctiva: "Clear",
      reCornea: "Clear",
      leCornea: "Clear",
      reAc: "Deep and quiet",
      leAc: "Deep and quiet",
      rePupil: "RAPD negative",
      lePupil: "RAPD negative",
      reIris: "Normal",
      leIris: "Normal",
      reLens: "Clear",
      leLens: "Clear",
      reVrr: "20/20",
      leVrr: "20/20",
      reVcdr: "0.3",
      leVcdr: "0.3",
      reOthers: "",
      leOthers: "",
      diagnosis: "Myopia",
      plan: "Prescribe corrective lenses",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing doctor", () => {
    const result = createEyeConsultationSchema.safeParse({
      patientId: "patient-123",
      consultationDate: "2026-03-15",
    });
    expect(result.success).toBe(false);
  });
});

describe("Medical History Schema", () => {
  it("accepts valid entry", () => {
    const result = createMedicalHistorySchema.safeParse({
      patientId: "patient-123",
      medicalConditions: "Type 2 Diabetes",
    });
    expect(result.success).toBe(true);
  });

  it("accepts entry with all fields", () => {
    const result = createMedicalHistorySchema.safeParse({
      patientId: "patient-123",
      medicalConditions: "Hypertension, Diabetes",
      medications: "Metformin 500mg BID, Lisinopril 10mg",
      notes: "Well controlled on current regimen",
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one content field", () => {
    const result = createMedicalHistorySchema.safeParse({
      patientId: "patient-123",
    });
    expect(result.success).toBe(false);
  });
});

describe("Lab Result Schema", () => {
  it("accepts valid lab result", () => {
    const result = createLabResultSchema.safeParse({
      patientId: "patient-123",
      testName: "Complete Blood Count",
      resultValue: "WBC 7.2 K/uL",
      datePerformed: "2026-03-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts lab result with notes", () => {
    const result = createLabResultSchema.safeParse({
      patientId: "patient-123",
      testName: "Blood Glucose",
      resultValue: "120 mg/dL",
      datePerformed: "2026-03-15",
      notes: "Fasting sample",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing testName", () => {
    const result = createLabResultSchema.safeParse({
      patientId: "patient-123",
      resultValue: "120 mg/dL",
      datePerformed: "2026-03-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing resultValue", () => {
    const result = createLabResultSchema.safeParse({
      patientId: "patient-123",
      testName: "Blood Glucose",
      datePerformed: "2026-03-15",
    });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/validations/clinical.test.ts`
Expected: FAIL — module not found

**Step 3: Create the validation schemas**

Create `src/lib/validations/clinical.ts`:

```typescript
import { z } from "zod";

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentDate: z.string().min(1, "Date is required"),
  appointmentTime: z
    .string()
    .min(1, "Time is required")
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  doctor: z.string().min(1, "Doctor is required"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  notes: z.string().optional(),
});

export const createEyeConsultationSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  consultationDate: z.string().min(1, "Date is required"),
  doctor: z.string().min(1, "Doctor is required"),
  chiefComplaint: z.string().optional(),
  reMovement: z.string().optional(),
  leMovement: z.string().optional(),
  reLids: z.string().optional(),
  leLids: z.string().optional(),
  reGlobe: z.string().optional(),
  leGlobe: z.string().optional(),
  reConjunctiva: z.string().optional(),
  leConjunctiva: z.string().optional(),
  reCornea: z.string().optional(),
  leCornea: z.string().optional(),
  reAc: z.string().optional(),
  leAc: z.string().optional(),
  rePupil: z.string().optional(),
  lePupil: z.string().optional(),
  reIris: z.string().optional(),
  leIris: z.string().optional(),
  reLens: z.string().optional(),
  leLens: z.string().optional(),
  reVrr: z.string().optional(),
  leVrr: z.string().optional(),
  reVcdr: z.string().optional(),
  leVcdr: z.string().optional(),
  reOthers: z.string().optional(),
  leOthers: z.string().optional(),
  diagnosis: z.string().optional(),
  plan: z.string().optional(),
});

export const createMedicalHistorySchema = z
  .object({
    patientId: z.string().min(1, "Patient is required"),
    medicalConditions: z.string().optional(),
    medications: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => data.medicalConditions || data.medications || data.notes,
    { message: "At least one content field is required" }
  );

export const createLabResultSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  testName: z.string().min(1, "Test name is required"),
  resultValue: z.string().min(1, "Result value is required"),
  datePerformed: z.string().min(1, "Date performed is required"),
  notes: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type CreateEyeConsultationInput = z.infer<typeof createEyeConsultationSchema>;
export type CreateMedicalHistoryInput = z.infer<typeof createMedicalHistorySchema>;
export type CreateLabResultInput = z.infer<typeof createLabResultSchema>;
```

**Step 4: Re-export from validations index**

Add to `src/lib/validations/index.ts`:

```typescript
export {
  createPatientSchema,
  updatePatientSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  createEyeConsultationSchema,
  createMedicalHistorySchema,
  createLabResultSchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type CreateAppointmentInput,
  type UpdateAppointmentStatusInput,
  type CreateEyeConsultationInput,
  type CreateMedicalHistoryInput,
  type CreateLabResultInput,
} from "./clinical";
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass (96 existing + new clinical validation tests)

**Step 6: Commit**

```bash
git add src/lib/validations/clinical.ts src/lib/validations/clinical.test.ts src/lib/validations/index.ts
git commit -m "feat: add validation schemas for clinical features with tests"
```

---

## Task 5: Patient API Routes

**Files:**
- Create: `src/app/api/patients/route.ts` (GET list, POST create)
- Create: `src/app/api/patients/[id]/route.ts` (GET detail, PUT update, DELETE)
- Create: `src/app/api/patients/[id]/link/route.ts` (POST link User account)
- Create: `src/app/api/patients/generate-id/route.ts` (GET next patient number)

**Step 1: Create patient list/create route**

Create `src/app/api/patients/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { createPatientSchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const search = url.searchParams.get("search") || "";

  const where: Record<string, unknown> = { organizationId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { patientNumber: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({
    patients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Generate next patient number
  const lastPatient = await prisma.patient.findFirst({
    where: { organizationId },
    orderBy: { patientNumber: "desc" },
    select: { patientNumber: true },
  });

  let nextNum = 1;
  if (lastPatient) {
    const match = lastPatient.patientNumber.match(/^P(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const patientNumber = `P${String(nextNum).padStart(4, "0")}`;

  const patient = await prisma.patient.create({
    data: {
      organizationId,
      patientNumber,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      gender: parsed.data.gender,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      emergencyContact: parsed.data.emergencyContact,
      emergencyPhone: parsed.data.emergencyPhone,
      allergies: parsed.data.allergies,
      medicalConditions: parsed.data.medicalConditions,
      medications: parsed.data.medications,
      notes: parsed.data.notes,
    },
  });

  // If patient has medical info, create initial medical history entry
  if (parsed.data.medicalConditions || parsed.data.medications || parsed.data.notes) {
    await prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: patient.id,
        medicalConditions: parsed.data.medicalConditions,
        medications: parsed.data.medications,
        notes: parsed.data.notes,
      },
    });
  }

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_PATIENT",
    entityType: "patient",
    entityId: patient.id,
    details: `Created patient ${patientNumber}: ${parsed.data.firstName} ${parsed.data.lastName}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ patient }, { status: 201 });
}
```

**Step 2: Create patient detail/update/delete route**

Create `src/app/api/patients/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { updatePatientSchema } from "@/lib/validations/clinical";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, organizationId },
    include: {
      appointments: { orderBy: { appointmentDate: "desc" }, take: 5 },
      labResults: { orderBy: { datePerformed: "desc" }, take: 5 },
      medicalHistories: { orderBy: { createdAt: "desc" }, take: 5 },
      eyeConsultations: { orderBy: { consultationDate: "desc" }, take: 5 },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const existing = await prisma.patient.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dateOfBirth) {
    updateData.dateOfBirth = new Date(parsed.data.dateOfBirth);
  }

  // Check if medical fields changed — if so, append history
  const medicalChanged =
    (parsed.data.medicalConditions !== undefined && parsed.data.medicalConditions !== existing.medicalConditions) ||
    (parsed.data.medications !== undefined && parsed.data.medications !== existing.medications) ||
    (parsed.data.notes !== undefined && parsed.data.notes !== existing.notes);

  const patient = await prisma.patient.update({
    where: { id },
    data: updateData,
  });

  if (medicalChanged) {
    await prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: id,
        medicalConditions: patient.medicalConditions,
        medications: patient.medications,
        notes: patient.notes,
      },
    });
  }

  await logAudit({
    userId,
    organizationId,
    action: "UPDATE_PATIENT",
    entityType: "patient",
    entityId: id,
    details: `Updated patient ${existing.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ patient });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const existing = await prisma.patient.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  await prisma.patient.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_PATIENT",
    entityType: "patient",
    entityId: id,
    details: `Deleted patient ${existing.patientNumber}: ${existing.firstName} ${existing.lastName}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Create patient account linking route**

Create `src/app/api/patients/[id]/link/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const body = await request.json();
  const { userEmail } = body;

  if (!userEmail) {
    return NextResponse.json({ error: "User email is required" }, { status: 400 });
  }

  const patient = await prisma.patient.findFirst({
    where: { id, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const userToLink = await prisma.user.findUnique({
    where: { email: userEmail },
  });
  if (!userToLink) {
    return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: { linkedUserId: userToLink.id },
  });

  await logAudit({
    userId,
    organizationId,
    action: "LINK_PATIENT_ACCOUNT",
    entityType: "patient",
    entityId: id,
    details: `Linked patient ${patient.patientNumber} to user ${userEmail}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ patient: updated });
}
```

**Step 4: Create patient ID generator route**

Create `src/app/api/patients/generate-id/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const lastPatient = await prisma.patient.findFirst({
    where: { organizationId },
    orderBy: { patientNumber: "desc" },
    select: { patientNumber: true },
  });

  let nextNum = 1;
  if (lastPatient) {
    const match = lastPatient.patientNumber.match(/^P(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return NextResponse.json({ patientNumber: `P${String(nextNum).padStart(4, "0")}` });
}
```

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/api/patients/
git commit -m "feat: add patient CRUD API with auto-numbering, account linking, and medical history dual-write"
```

---

## Task 6: Appointments API Routes

**Files:**
- Create: `src/app/api/appointments/route.ts` (GET list, POST create)
- Create: `src/app/api/appointments/[id]/route.ts` (GET detail, PUT update status, DELETE)
- Create: `src/app/api/appointments/upcoming/route.ts` (GET upcoming)

**Step 1: Create appointment list/create route**

Create `src/app/api/appointments/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createAppointmentSchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const patientId = url.searchParams.get("patientId");
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = { organizationId };
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({
    appointments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId,
      appointmentDate: new Date(parsed.data.appointmentDate),
      appointmentTime: parsed.data.appointmentTime,
      doctor: parsed.data.doctor,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_APPOINTMENT",
    entityType: "appointment",
    entityId: appointment.id,
    details: `Created appointment for patient ${patient.patientNumber} on ${parsed.data.appointmentDate}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
```

**Step 2: Create appointment detail/update/delete route**

Create `src/app/api/appointments/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { updateAppointmentStatusSchema } from "@/lib/validations/clinical";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: { patient: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const existing = await prisma.appointment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateAppointmentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? existing.notes,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "UPDATE_APPOINTMENT",
    entityType: "appointment",
    entityId: id,
    details: `Updated appointment status to ${parsed.data.status}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ appointment });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const existing = await prisma.appointment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_APPOINTMENT",
    entityType: "appointment",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Create upcoming appointments route**

Create `src/app/api/appointments/upcoming/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "appointments");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      appointmentDate: { gte: today },
      status: "SCHEDULED",
    },
    include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
    orderBy: [{ appointmentDate: "asc" }, { appointmentTime: "asc" }],
    take: limit,
  });

  return NextResponse.json({ appointments });
}
```

**Step 4: Commit**

```bash
git add src/app/api/appointments/
git commit -m "feat: add appointments API with feature gating, status management, and upcoming query"
```

---

## Task 7: Eye Consultations API Routes

**Files:**
- Create: `src/app/api/eye-consultations/route.ts` (GET list, POST create)
- Create: `src/app/api/eye-consultations/[id]/route.ts` (GET detail, DELETE)

**Step 1: Create eye consultation list/create route**

Create `src/app/api/eye-consultations/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createEyeConsultationSchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const patientId = url.searchParams.get("patientId");

  const where: Record<string, unknown> = { organizationId };
  if (patientId) where.patientId = patientId;

  const [consultations, total] = await Promise.all([
    prisma.eyeConsultation.findMany({
      where,
      include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
      orderBy: { consultationDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.eyeConsultation.count({ where }),
  ]);

  return NextResponse.json({
    consultations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createEyeConsultationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  const consultation = await prisma.eyeConsultation.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId,
      consultationDate: new Date(parsed.data.consultationDate),
      doctor: parsed.data.doctor,
      chiefComplaint: parsed.data.chiefComplaint,
      reMovement: parsed.data.reMovement,
      leMovement: parsed.data.leMovement,
      reLids: parsed.data.reLids,
      leLids: parsed.data.leLids,
      reGlobe: parsed.data.reGlobe,
      leGlobe: parsed.data.leGlobe,
      reConjunctiva: parsed.data.reConjunctiva,
      leConjunctiva: parsed.data.leConjunctiva,
      reCornea: parsed.data.reCornea,
      leCornea: parsed.data.leCornea,
      reAc: parsed.data.reAc,
      leAc: parsed.data.leAc,
      rePupil: parsed.data.rePupil,
      lePupil: parsed.data.lePupil,
      reIris: parsed.data.reIris,
      leIris: parsed.data.leIris,
      reLens: parsed.data.reLens,
      leLens: parsed.data.leLens,
      reVrr: parsed.data.reVrr,
      leVrr: parsed.data.leVrr,
      reVcdr: parsed.data.reVcdr,
      leVcdr: parsed.data.leVcdr,
      reOthers: parsed.data.reOthers,
      leOthers: parsed.data.leOthers,
      diagnosis: parsed.data.diagnosis,
      plan: parsed.data.plan,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_EYE_CONSULTATION",
    entityType: "eye_consultation",
    entityId: consultation.id,
    details: `Created eye consultation for patient ${patient.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ consultation }, { status: 201 });
}
```

**Step 2: Create eye consultation detail/delete route**

Create `src/app/api/eye-consultations/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const consultation = await prisma.eyeConsultation.findFirst({
    where: { id, organizationId },
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "Eye consultation not found" }, { status: 404 });
  }

  return NextResponse.json({ consultation });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "eye_consultation");
  if (featureGate) return featureGate;

  const existing = await prisma.eyeConsultation.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Eye consultation not found" }, { status: 404 });
  }

  await prisma.eyeConsultation.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_EYE_CONSULTATION",
    entityType: "eye_consultation",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add src/app/api/eye-consultations/
git commit -m "feat: add eye consultations API with bilateral exam fields, feature gating"
```

---

## Task 8: Medical History API Routes

**Files:**
- Create: `src/app/api/medical-history/route.ts` (GET list, POST append)

**Step 1: Create medical history route (append-only — no PUT, no DELETE)**

Create `src/app/api/medical-history/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createMedicalHistorySchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "medical_history");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const patientId = url.searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "patientId query parameter is required" }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  const entries = await prisma.medicalHistory.findMany({
    where: { patientId, organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ entries, currentPatient: { medicalConditions: patient.medicalConditions, medications: patient.medications, notes: patient.notes } });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "medical_history");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createMedicalHistorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  // Dual-write: append to history AND update patient's current fields
  const [entry] = await prisma.$transaction([
    prisma.medicalHistory.create({
      data: {
        organizationId,
        patientId: parsed.data.patientId,
        medicalConditions: parsed.data.medicalConditions,
        medications: parsed.data.medications,
        notes: parsed.data.notes,
      },
    }),
    prisma.patient.update({
      where: { id: parsed.data.patientId },
      data: {
        medicalConditions: parsed.data.medicalConditions ?? patient.medicalConditions,
        medications: parsed.data.medications ?? patient.medications,
        notes: parsed.data.notes ?? patient.notes,
      },
    }),
  ]);

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_MEDICAL_HISTORY",
    entityType: "medical_history",
    entityId: entry.id,
    details: `Appended medical history for patient ${patient.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ entry }, { status: 201 });
}
```

**Step 2: Commit**

```bash
git add src/app/api/medical-history/
git commit -m "feat: add immutable append-only medical history API with dual-write pattern"
```

---

## Task 9: Lab Results API Routes

**Files:**
- Create: `src/app/api/lab-results/route.ts` (GET list, POST create)
- Create: `src/app/api/lab-results/[id]/route.ts` (GET detail, DELETE)

**Step 1: Create lab results list/create route**

Create `src/app/api/lab-results/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";
import { createLabResultSchema } from "@/lib/validations/clinical";

export async function GET(request: Request) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const patientId = url.searchParams.get("patientId");

  const where: Record<string, unknown> = { organizationId };
  if (patientId) where.patientId = patientId;

  const [results, total] = await Promise.all([
    prisma.labResult.findMany({
      where,
      include: { patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } } },
      orderBy: { datePerformed: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.labResult.count({ where }),
  ]);

  return NextResponse.json({
    results,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const body = await request.json();
  const parsed = createLabResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in this organization" }, { status: 404 });
  }

  const result = await prisma.labResult.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId,
      testName: parsed.data.testName,
      resultValue: parsed.data.resultValue,
      datePerformed: new Date(parsed.data.datePerformed),
      notes: parsed.data.notes,
    },
  });

  await logAudit({
    userId,
    organizationId,
    action: "CREATE_LAB_RESULT",
    entityType: "lab_result",
    entityId: result.id,
    details: `Added lab result "${parsed.data.testName}" for patient ${patient.patientNumber}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ result }, { status: 201 });
}
```

**Step 2: Create lab result detail/delete route**

Create `src/app/api/lab-results/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withOrgAuth, type OrgAuthContext } from "@/lib/org-auth";
import { requireFeature } from "@/lib/features";
import { logAudit, getClientIp } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const result = await prisma.labResult.findFirst({
    where: { id, organizationId },
    include: { patient: true },
  });

  if (!result) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  return NextResponse.json({ result });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOrgAuth(request, ["OWNER", "ADMIN", "DOCTOR"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, organizationId } = auth as OrgAuthContext;
  const { id } = await params;

  const featureGate = await requireFeature(organizationId, "lab_results");
  if (featureGate) return featureGate;

  const existing = await prisma.labResult.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  await prisma.labResult.delete({ where: { id } });

  await logAudit({
    userId,
    organizationId,
    action: "DELETE_LAB_RESULT",
    entityType: "lab_result",
    entityId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add src/app/api/lab-results/
git commit -m "feat: add lab results API with feature gating and audit logging"
```

---

## Task 10: Build Verification & Final Commit

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (96 existing + clinical validation tests)

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Build**

Run: `npm run build`
Expected: Build succeeds, all new routes visible in output

**Step 4: Final commit if any remaining changes**

```bash
git add -A
git commit -m "feat: Phase 2 complete — clinical features with Patient, Appointments, Eye Consultations, Medical History, Lab Results"
```

---

## Summary

**New models:** Patient, Appointment, EyeConsultation, MedicalHistory, LabResult
**New enums:** Gender, AppointmentStatus
**New feature flags:** lab_results, medical_history
**New audit actions:** 12 clinical actions
**New API routes:** 14 route files across 5 feature modules
**Architecture patterns:** Feature gating, org scoping, auto patient numbering, dual-write medical history, account linking

**API Endpoints Created:**

| Method | Route | Feature Flag | Access |
|--------|-------|-------------|--------|
| GET/POST | /api/patients | none | Any org member |
| GET/PUT/DELETE | /api/patients/[id] | none | Role-restricted |
| POST | /api/patients/[id]/link | none | OWNER/ADMIN/DOCTOR |
| GET | /api/patients/generate-id | none | Any org member |
| GET/POST | /api/appointments | appointments | Any/All roles |
| GET/PUT/DELETE | /api/appointments/[id] | appointments | Role-restricted |
| GET | /api/appointments/upcoming | appointments | Any org member |
| GET/POST | /api/eye-consultations | eye_consultation | Any/DOCTOR+ |
| GET/DELETE | /api/eye-consultations/[id] | eye_consultation | Role-restricted |
| GET/POST | /api/medical-history | medical_history | Any/NURSE+ |
| GET/POST | /api/lab-results | lab_results | Any/NURSE+ |
| GET/DELETE | /api/lab-results/[id] | lab_results | Role-restricted |
