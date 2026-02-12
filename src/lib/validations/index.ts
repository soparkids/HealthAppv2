import { z } from "zod";

// Re-export auth schemas from the dedicated auth module
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
} from "./auth";

export const medicalRecordSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["MRI", "XRAY", "ULTRASOUND", "CT_SCAN", "OTHER"]),
  bodyPart: z.string().optional(),
  facility: z.string().optional(),
  referringPhysician: z.string().optional(),
  recordDate: z.string().min(1, "Record date is required"),
  notes: z.string().optional(),
});

export const shareRecordSchema = z.object({
  medicalRecordId: z.string().min(1, "Record is required"),
  sharedWithEmail: z.string().email("Invalid email address"),
  permission: z.enum(["VIEW", "DOWNLOAD"]).default("VIEW"),
  expiresAt: z.string().optional(),
});

export const familyMemberSchema = z.object({
  memberEmail: z.string().email("Invalid email address"),
  relationship: z.string().min(1, "Relationship is required"),
});

export const followUpSchema = z.object({
  recommendation: z.string().min(1, "Recommendation is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
export type ShareRecordInput = z.infer<typeof shareRecordSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
