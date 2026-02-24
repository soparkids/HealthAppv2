import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  medicalRecordSchema,
  shareRecordSchema,
  familyMemberSchema,
  followUpSchema,
} from "./index";
import {
  createOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "./organization";

// --- Auth Schemas ---

describe("loginSchema", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "any-password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const validInput = {
    name: "Kevin Obi",
    email: "kevin@example.com",
    password: "SecurePass1!xyz",
    confirmPassword: "SecurePass1!xyz",
    role: "PATIENT" as const,
  };

  it("accepts valid registration input", () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 12 characters", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "Short1!",
      confirmPassword: "Short1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "nouppercase1!ab",
      confirmPassword: "nouppercase1!ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "NOLOWERCASE1!AB",
      confirmPassword: "NOLOWERCASE1!AB",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "NoNumberHere!!a",
      confirmPassword: "NoNumberHere!!a",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without special character", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "NoSpecialChar1ab",
      confirmPassword: "NoSpecialChar1ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      confirmPassword: "DifferentPass1!a",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      name: "K",
    });
    expect(result.success).toBe(false);
  });

  it("only accepts PATIENT or PROVIDER roles", () => {
    const admin = registerSchema.safeParse({ ...validInput, role: "ADMIN" });
    expect(admin.success).toBe(false);

    const patient = registerSchema.safeParse({ ...validInput, role: "PATIENT" });
    expect(patient.success).toBe(true);

    const provider = registerSchema.safeParse({ ...validInput, role: "PROVIDER" });
    expect(provider.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-email" });
    expect(result.success).toBe(false);
  });
});

// --- Organization Schemas ---

describe("createOrganizationSchema", () => {
  it("accepts valid org input", () => {
    const result = createOrganizationSchema.safeParse({
      name: "General Hospital",
      slug: "general-hospital",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = createOrganizationSchema.safeParse({
      name: "G",
      slug: "gh",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase letters", () => {
    const result = createOrganizationSchema.safeParse({
      name: "General Hospital",
      slug: "General-Hospital",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    const result = createOrganizationSchema.safeParse({
      name: "General Hospital",
      slug: "general hospital",
    });
    expect(result.success).toBe(false);
  });

  it("accepts slug with hyphens between words", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Lagos Teaching Hospital",
      slug: "lagos-teaching-hospital",
    });
    expect(result.success).toBe(true);
  });

  it("rejects slug starting or ending with hyphen", () => {
    const r1 = createOrganizationSchema.safeParse({
      name: "Hospital",
      slug: "-hospital",
    });
    expect(r1.success).toBe(false);

    const r2 = createOrganizationSchema.safeParse({
      name: "Hospital",
      slug: "hospital-",
    });
    expect(r2.success).toBe(false);
  });

  it("rejects slug with consecutive hyphens", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Hospital",
      slug: "general--hospital",
    });
    expect(result.success).toBe(false);
  });
});

describe("addMemberSchema", () => {
  it("accepts valid member input", () => {
    const result = addMemberSchema.safeParse({
      email: "doc@hospital.com",
      role: "DOCTOR",
    });
    expect(result.success).toBe(true);
  });

  it("rejects OWNER role (cannot add owners)", () => {
    const result = addMemberSchema.safeParse({
      email: "doc@hospital.com",
      role: "OWNER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid org roles", () => {
    for (const role of ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]) {
      const result = addMemberSchema.safeParse({
        email: "member@hospital.com",
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid email", () => {
    const result = addMemberSchema.safeParse({
      email: "bad-email",
      role: "DOCTOR",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateMemberRoleSchema", () => {
  it("accepts valid role updates", () => {
    for (const role of ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]) {
      const result = updateMemberRoleSchema.safeParse({ role });
      expect(result.success).toBe(true);
    }
  });

  it("rejects OWNER role (cannot promote to owner)", () => {
    const result = updateMemberRoleSchema.safeParse({ role: "OWNER" });
    expect(result.success).toBe(false);
  });
});

// --- Medical Schemas ---

describe("medicalRecordSchema", () => {
  it("accepts valid record input", () => {
    const result = medicalRecordSchema.safeParse({
      title: "Chest X-Ray",
      type: "XRAY",
      recordDate: "2026-02-24",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = medicalRecordSchema.safeParse({
      title: "",
      type: "MRI",
      recordDate: "2026-02-24",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid record type", () => {
    const result = medicalRecordSchema.safeParse({
      title: "Test",
      type: "BLOOD_TEST",
      recordDate: "2026-02-24",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid record types", () => {
    for (const type of ["MRI", "XRAY", "ULTRASOUND", "CT_SCAN", "OTHER"]) {
      const result = medicalRecordSchema.safeParse({
        title: "Test",
        type,
        recordDate: "2026-02-24",
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional fields", () => {
    const result = medicalRecordSchema.safeParse({
      title: "Brain MRI",
      type: "MRI",
      bodyPart: "Brain",
      facility: "Lagos General",
      referringPhysician: "Dr. Obi",
      recordDate: "2026-02-24",
      notes: "Follow-up scan",
    });
    expect(result.success).toBe(true);
  });
});

describe("shareRecordSchema", () => {
  it("accepts valid share input", () => {
    const result = shareRecordSchema.safeParse({
      medicalRecordId: "rec-123",
      sharedWithEmail: "doc@hospital.com",
    });
    expect(result.success).toBe(true);
  });

  it("defaults permission to VIEW", () => {
    const result = shareRecordSchema.safeParse({
      medicalRecordId: "rec-123",
      sharedWithEmail: "doc@hospital.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission).toBe("VIEW");
    }
  });

  it("accepts DOWNLOAD permission", () => {
    const result = shareRecordSchema.safeParse({
      medicalRecordId: "rec-123",
      sharedWithEmail: "doc@hospital.com",
      permission: "DOWNLOAD",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = shareRecordSchema.safeParse({
      medicalRecordId: "rec-123",
      sharedWithEmail: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("familyMemberSchema", () => {
  it("accepts valid input", () => {
    const result = familyMemberSchema.safeParse({
      memberEmail: "family@example.com",
      relationship: "Spouse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty relationship", () => {
    const result = familyMemberSchema.safeParse({
      memberEmail: "family@example.com",
      relationship: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("followUpSchema", () => {
  it("accepts valid input", () => {
    const result = followUpSchema.safeParse({
      recommendation: "Schedule follow-up MRI in 3 months",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty recommendation", () => {
    const result = followUpSchema.safeParse({
      recommendation: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = followUpSchema.safeParse({
      recommendation: "Blood work",
      dueDate: "2026-05-01",
      notes: "Fasting required",
    });
    expect(result.success).toBe(true);
  });
});
