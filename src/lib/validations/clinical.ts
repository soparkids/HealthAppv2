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
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  datePerformed: z.string().min(1, "Date performed is required"),
  notes: z.string().optional(),
});

export const interpretLabResultSchema = z.object({
  preferredProvider: z.enum(["openai", "anthropic", "google"]).optional(),
});

export type InterpretLabResultInput = z.infer<typeof interpretLabResultSchema>;

/** Schema for updating org patient number prefix */
export const updatePatientPrefixSchema = z.object({
  prefix: z
    .string()
    .min(1, "Prefix is required")
    .max(10, "Prefix must be 10 characters or fewer")
    .regex(/^[A-Z0-9]+$/, "Prefix must be uppercase letters and numbers only"),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type CreateEyeConsultationInput = z.infer<typeof createEyeConsultationSchema>;
export type CreateMedicalHistoryInput = z.infer<typeof createMedicalHistorySchema>;
export type CreateLabResultInput = z.infer<typeof createLabResultSchema>;
export type UpdatePatientPrefixInput = z.infer<typeof updatePatientPrefixSchema>;
