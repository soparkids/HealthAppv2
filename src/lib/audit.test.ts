import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAudit, getClientIp } from "./audit";
import { prisma } from "@/lib/prisma";

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an audit log entry with all fields", async () => {
    await logAudit({
      userId: "user-123",
      organizationId: "org-456",
      action: "CREATE_RECORD",
      entityType: "MedicalRecord",
      entityId: "record-789",
      details: "Created MRI scan record",
      ipAddress: "192.168.1.1",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        organizationId: "org-456",
        action: "CREATE_RECORD",
        entityType: "MedicalRecord",
        entityId: "record-789",
        details: "Created MRI scan record",
        ipAddress: "192.168.1.1",
      },
    });
  });

  it("creates an audit log with only required fields", async () => {
    await logAudit({ action: "LOGIN" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: undefined,
        organizationId: undefined,
        action: "LOGIN",
        entityType: undefined,
        entityId: undefined,
        details: undefined,
        ipAddress: undefined,
      },
    });
  });

  it("does not throw when prisma fails", async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValueOnce(
      new Error("DB connection failed")
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(logAudit({ action: "LOGIN" })).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith("Audit log failed:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it("extracts first IP from comma-separated x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18, 150.172.238.178" },
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it("trims whitespace from the extracted IP", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  203.0.113.50  , 70.41.3.18" },
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it("returns 'unknown' when no forwarded header present", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});
