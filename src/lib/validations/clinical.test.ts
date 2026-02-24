import { describe, it, expect } from "vitest";
import {
  createPatientSchema,
  updatePatientSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  createEyeConsultationSchema,
  createMedicalHistorySchema,
  createLabResultSchema,
  updatePatientPrefixSchema,
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

    it("accepts empty string email", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        gender: "MALE",
        email: "",
      });
      expect(result.success).toBe(true);
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

describe("Patient Number Prefix Schema", () => {
  it("accepts valid uppercase prefix", () => {
    const result = updatePatientPrefixSchema.safeParse({ prefix: "LUTH" });
    expect(result.success).toBe(true);
  });

  it("accepts alphanumeric prefix", () => {
    const result = updatePatientPrefixSchema.safeParse({ prefix: "UCH01" });
    expect(result.success).toBe(true);
  });

  it("rejects empty prefix", () => {
    const result = updatePatientPrefixSchema.safeParse({ prefix: "" });
    expect(result.success).toBe(false);
  });

  it("rejects lowercase prefix", () => {
    const result = updatePatientPrefixSchema.safeParse({ prefix: "luth" });
    expect(result.success).toBe(false);
  });

  it("rejects prefix with special characters", () => {
    const result = updatePatientPrefixSchema.safeParse({ prefix: "LU-TH" });
    expect(result.success).toBe(false);
  });

  it("rejects prefix longer than 10 characters", () => {
    const result = updatePatientPrefixSchema.safeParse({ prefix: "ABCDEFGHIJK" });
    expect(result.success).toBe(false);
  });
});
