import { describe, it, expect } from "vitest";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  createMaintenanceLogSchema,
  createSensorReadingSchema,
  batchSensorReadingsSchema,
  triggerPredictionSchema,
  updateAlertStatusSchema,
  importEquipmentRowSchema,
  equipmentTypeEnum,
  equipmentStatusEnum,
  maintenanceTypeEnum,
  sensorMetricTypeEnum,
  alertUrgencyEnum,
  alertStatusEnum,
} from "./equipment";

// ─── Enum Validations ───────────────────────────────────────

describe("equipmentTypeEnum", () => {
  it("accepts all valid equipment types", () => {
    const types = [
      "MRI", "XRAY", "CT_SCANNER", "ULTRASOUND", "VENTILATOR",
      "PATIENT_MONITOR", "INFUSION_PUMP", "DEFIBRILLATOR", "OTHER",
    ];
    for (const type of types) {
      expect(equipmentTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it("rejects invalid equipment type", () => {
    expect(equipmentTypeEnum.safeParse("BLOOD_ANALYZER").success).toBe(false);
    expect(equipmentTypeEnum.safeParse("").success).toBe(false);
  });
});

describe("equipmentStatusEnum", () => {
  it("accepts all valid statuses", () => {
    const statuses = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "DECOMMISSIONED"];
    for (const status of statuses) {
      expect(equipmentStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(equipmentStatusEnum.safeParse("BROKEN").success).toBe(false);
  });
});

describe("maintenanceTypeEnum", () => {
  it("accepts all valid maintenance types", () => {
    const types = ["PREVENTIVE", "CORRECTIVE", "CALIBRATION", "INSPECTION", "PART_REPLACEMENT"];
    for (const type of types) {
      expect(maintenanceTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it("rejects invalid type", () => {
    expect(maintenanceTypeEnum.safeParse("EMERGENCY").success).toBe(false);
  });
});

describe("sensorMetricTypeEnum", () => {
  it("accepts all valid metric types", () => {
    const types = ["USAGE_HOURS", "ERROR_COUNT", "TEMPERATURE", "VIBRATION", "POWER_CYCLES"];
    for (const type of types) {
      expect(sensorMetricTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it("rejects invalid metric type", () => {
    expect(sensorMetricTypeEnum.safeParse("HUMIDITY").success).toBe(false);
  });
});

describe("alertUrgencyEnum", () => {
  it("accepts all valid urgency levels", () => {
    for (const level of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) {
      expect(alertUrgencyEnum.safeParse(level).success).toBe(true);
    }
  });

  it("rejects invalid urgency", () => {
    expect(alertUrgencyEnum.safeParse("EXTREME").success).toBe(false);
  });
});

describe("alertStatusEnum", () => {
  it("accepts all valid alert statuses", () => {
    for (const status of ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]) {
      expect(alertStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(alertStatusEnum.safeParse("CLOSED").success).toBe(false);
  });
});

// ─── createEquipmentSchema ──────────────────────────────────

describe("createEquipmentSchema", () => {
  const validInput = {
    name: "MRI Scanner Room 3",
    type: "MRI",
    serialNumber: "SN-2024-001",
  };

  it("accepts valid equipment input with required fields only", () => {
    const result = createEquipmentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid equipment input with all fields", () => {
    const result = createEquipmentSchema.safeParse({
      ...validInput,
      manufacturer: "Siemens",
      model: "MAGNETOM Sola",
      installDate: "2024-01-15",
      warrantyExpiry: "2027-01-15",
      location: "Building A, Room 301",
      status: "ACTIVE",
      notes: "Calibrated on install",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createEquipmentSchema.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty serialNumber", () => {
    const result = createEquipmentSchema.safeParse({
      ...validInput,
      serialNumber: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid equipment type", () => {
    const result = createEquipmentSchema.safeParse({
      ...validInput,
      type: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name: _, ...noName } = validInput;
    const result = createEquipmentSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const { type: _, ...noType } = validInput;
    const result = createEquipmentSchema.safeParse(noType);
    expect(result.success).toBe(false);
  });

  it("accepts all valid equipment types", () => {
    const types = [
      "MRI", "XRAY", "CT_SCANNER", "ULTRASOUND", "VENTILATOR",
      "PATIENT_MONITOR", "INFUSION_PUMP", "DEFIBRILLATOR", "OTHER",
    ];
    for (const type of types) {
      const result = createEquipmentSchema.safeParse({ ...validInput, type });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid equipment statuses", () => {
    const statuses = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "DECOMMISSIONED"];
    for (const status of statuses) {
      const result = createEquipmentSchema.safeParse({ ...validInput, status });
      expect(result.success).toBe(true);
    }
  });
});

// ─── updateEquipmentSchema ──────────────────────────────────

describe("updateEquipmentSchema", () => {
  it("accepts partial updates (name only)", () => {
    const result = updateEquipmentSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates (status only)", () => {
    const result = updateEquipmentSchema.safeParse({ status: "UNDER_MAINTENANCE" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no updates)", () => {
    const result = updateEquipmentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid type in partial update", () => {
    const result = updateEquipmentSchema.safeParse({ type: "INVALID" });
    expect(result.success).toBe(false);
  });
});

// ─── createMaintenanceLogSchema ─────────────────────────────

describe("createMaintenanceLogSchema", () => {
  const validInput = {
    type: "PREVENTIVE",
    description: "Routine calibration check",
    performedBy: "John Smith",
  };

  it("accepts valid maintenance log input", () => {
    const result = createMaintenanceLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts all fields including optional", () => {
    const result = createMaintenanceLogSchema.safeParse({
      ...validInput,
      cost: 250.50,
      partsReplaced: "Imaging coil, Power supply",
      nextScheduledDate: "2026-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = createMaintenanceLogSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty performedBy", () => {
    const result = createMaintenanceLogSchema.safeParse({
      ...validInput,
      performedBy: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid maintenance type", () => {
    const result = createMaintenanceLogSchema.safeParse({
      ...validInput,
      type: "EMERGENCY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative cost", () => {
    const result = createMaintenanceLogSchema.safeParse({
      ...validInput,
      cost: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid maintenance types", () => {
    const types = ["PREVENTIVE", "CORRECTIVE", "CALIBRATION", "INSPECTION", "PART_REPLACEMENT"];
    for (const type of types) {
      const result = createMaintenanceLogSchema.safeParse({ ...validInput, type });
      expect(result.success).toBe(true);
    }
  });
});

// ─── createSensorReadingSchema ──────────────────────────────

describe("createSensorReadingSchema", () => {
  it("accepts valid sensor reading", () => {
    const result = createSensorReadingSchema.safeParse({
      metricType: "TEMPERATURE",
      value: 37.5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts with optional unit and timestamp", () => {
    const result = createSensorReadingSchema.safeParse({
      metricType: "USAGE_HOURS",
      value: 1250.5,
      unit: "hours",
      timestamp: "2026-02-25T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid metric type", () => {
    const result = createSensorReadingSchema.safeParse({
      metricType: "HUMIDITY",
      value: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing value", () => {
    const result = createSensorReadingSchema.safeParse({
      metricType: "TEMPERATURE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts negative values (e.g. temperature)", () => {
    const result = createSensorReadingSchema.safeParse({
      metricType: "TEMPERATURE",
      value: -10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts zero value", () => {
    const result = createSensorReadingSchema.safeParse({
      metricType: "ERROR_COUNT",
      value: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ─── batchSensorReadingsSchema ──────────────────────────────

describe("batchSensorReadingsSchema", () => {
  it("accepts a batch of readings", () => {
    const result = batchSensorReadingsSchema.safeParse({
      readings: [
        { metricType: "TEMPERATURE", value: 37.5 },
        { metricType: "VIBRATION", value: 0.03, unit: "mm/s" },
        { metricType: "USAGE_HOURS", value: 1250 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty readings array", () => {
    const result = batchSensorReadingsSchema.safeParse({ readings: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid readings in batch", () => {
    const result = batchSensorReadingsSchema.safeParse({
      readings: [
        { metricType: "INVALID", value: 50 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ─── triggerPredictionSchema ────────────────────────────────

describe("triggerPredictionSchema", () => {
  it("accepts empty body (no preferred provider)", () => {
    const result = triggerPredictionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid provider names", () => {
    for (const provider of ["openai", "anthropic", "google"]) {
      const result = triggerPredictionSchema.safeParse({ preferredProvider: provider });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid provider name", () => {
    const result = triggerPredictionSchema.safeParse({ preferredProvider: "chatgpt" });
    expect(result.success).toBe(false);
  });
});

// ─── updateAlertStatusSchema ────────────────────────────────

describe("updateAlertStatusSchema", () => {
  it("accepts valid alert status updates", () => {
    for (const status of ["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]) {
      const result = updateAlertStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects ACTIVE status (cannot set back to ACTIVE)", () => {
    const result = updateAlertStatusSchema.safeParse({ status: "ACTIVE" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = updateAlertStatusSchema.safeParse({ status: "CLOSED" });
    expect(result.success).toBe(false);
  });

  it("rejects empty status", () => {
    const result = updateAlertStatusSchema.safeParse({ status: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = updateAlertStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── importEquipmentRowSchema ───────────────────────────────

describe("importEquipmentRowSchema", () => {
  const validRow = {
    name: "X-Ray Unit 2",
    type: "XRAY",
    serialNumber: "SN-2024-002",
  };

  it("accepts valid import row", () => {
    const result = importEquipmentRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it("accepts row with all optional fields", () => {
    const result = importEquipmentRowSchema.safeParse({
      ...validRow,
      manufacturer: "GE Healthcare",
      model: "Optima XR220",
      installDate: "2024-03-01",
      warrantyExpiry: "2027-03-01",
      location: "Building B, Room 105",
      notes: "Moved from Room 102",
    });
    expect(result.success).toBe(true);
  });

  it("rejects row missing name", () => {
    const { name: _, ...noName } = validRow;
    const result = importEquipmentRowSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects row with invalid type", () => {
    const result = importEquipmentRowSchema.safeParse({
      ...validRow,
      type: "BLOOD_ANALYZER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects row missing serialNumber", () => {
    const { serialNumber: _, ...noSerial } = validRow;
    const result = importEquipmentRowSchema.safeParse(noSerial);
    expect(result.success).toBe(false);
  });
});
