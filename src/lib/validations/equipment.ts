import { z } from "zod";

// ─── Equipment Schemas ──────────────────────────────────────

export const equipmentTypeEnum = z.enum([
  "MRI",
  "XRAY",
  "CT_SCANNER",
  "ULTRASOUND",
  "VENTILATOR",
  "PATIENT_MONITOR",
  "INFUSION_PUMP",
  "DEFIBRILLATOR",
  "OTHER",
]);

export const equipmentStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "DECOMMISSIONED",
]);

export const maintenanceTypeEnum = z.enum([
  "PREVENTIVE",
  "CORRECTIVE",
  "CALIBRATION",
  "INSPECTION",
  "PART_REPLACEMENT",
]);

export const sensorMetricTypeEnum = z.enum([
  "USAGE_HOURS",
  "ERROR_COUNT",
  "TEMPERATURE",
  "VIBRATION",
  "POWER_CYCLES",
]);

export const alertUrgencyEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const alertStatusEnum = z.enum([
  "ACTIVE",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
]);

export const createEquipmentSchema = z.object({
  name: z.string().min(1, "Equipment name is required"),
  type: equipmentTypeEnum,
  serialNumber: z.string().min(1, "Serial number is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  location: z.string().optional(),
  status: equipmentStatusEnum.optional(),
  notes: z.string().optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const createMaintenanceLogSchema = z.object({
  type: maintenanceTypeEnum,
  description: z.string().min(1, "Description is required"),
  performedBy: z.string().min(1, "Performed by is required"),
  cost: z.number().min(0).optional(),
  partsReplaced: z.string().optional(),
  nextScheduledDate: z.string().optional(),
});

export const createSensorReadingSchema = z.object({
  metricType: sensorMetricTypeEnum,
  value: z.number(),
  unit: z.string().optional(),
  timestamp: z.string().optional(),
});

export const batchSensorReadingsSchema = z.object({
  readings: z.array(createSensorReadingSchema).min(1, "At least one reading is required"),
});

export const triggerPredictionSchema = z.object({
  preferredProvider: z.enum(["openai", "anthropic", "google"]).optional(),
});

export const updateAlertStatusSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]),
});

export const importEquipmentRowSchema = z.object({
  name: z.string().min(1, "Equipment name is required"),
  type: equipmentTypeEnum,
  serialNumber: z.string().min(1, "Serial number is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>;
export type CreateSensorReadingInput = z.infer<typeof createSensorReadingSchema>;
export type BatchSensorReadingsInput = z.infer<typeof batchSensorReadingsSchema>;
export type TriggerPredictionInput = z.infer<typeof triggerPredictionSchema>;
export type UpdateAlertStatusInput = z.infer<typeof updateAlertStatusSchema>;
export type ImportEquipmentRowInput = z.infer<typeof importEquipmentRowSchema>;
