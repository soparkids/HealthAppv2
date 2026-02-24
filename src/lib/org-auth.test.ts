import { describe, it, expect, vi, beforeEach } from "vitest";
import { withOrgAuth, withAuth } from "./org-auth";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

describe("withOrgAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when no organization ID in headers", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", role: "PROVIDER" },
      expires: "",
    });

    const request = new Request("http://localhost/api/test");
    const result = await withOrgAuth(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Organization context required");
  });

  it("returns 403 when user is not a member of the org", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", role: "PROVIDER" },
      expires: "",
    });
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Not a member of this organization");
  });

  it("returns 403 when user role is not in allowed roles", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", role: "PROVIDER" },
      expires: "",
    });
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "NURSE",
      createdAt: new Date(),
    } as any);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request, ["OWNER", "ADMIN"]);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Insufficient permissions");
  });

  it("returns auth context when user is a valid member", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "doc@hospital.com", role: "PROVIDER" },
      expires: "",
    });
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "DOCTOR",
      createdAt: new Date(),
    } as any);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({
      userId: "user-1",
      email: "doc@hospital.com",
      role: "PROVIDER",
      organizationId: "org-1",
      orgRole: "DOCTOR",
    });
  });

  it("returns auth context when user role is in allowed roles", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "admin@hospital.com", role: "PROVIDER" },
      expires: "",
    });
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "ADMIN",
      createdAt: new Date(),
    } as any);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request, ["OWNER", "ADMIN"]);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({
      userId: "user-1",
      email: "admin@hospital.com",
      role: "PROVIDER",
      organizationId: "org-1",
      orgRole: "ADMIN",
    });
  });

  it("allows any role when no allowedOrgRoles specified", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "rec@hospital.com", role: "PROVIDER" },
      expires: "",
    });
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "RECEPTIONIST",
      createdAt: new Date(),
    } as any);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request);

    expect(result).not.toBeInstanceOf(NextResponse);
    const ctx = result as { orgRole: string };
    expect(ctx.orgRole).toBe("RECEPTIONIST");
  });

  it("defaults email to empty string when session email is null", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: null, role: "PROVIDER" },
      expires: "",
    });
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "DOCTOR",
      createdAt: new Date(),
    } as any);

    const request = new Request("http://localhost/api/test", {
      headers: { "x-organization-id": "org-1" },
    });
    const result = await withOrgAuth(request);

    expect(result).not.toBeInstanceOf(NextResponse);
    const ctx = result as { email: string };
    expect(ctx.email).toBe("");
  });
});

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await withAuth();
    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
  });

  it("returns user context when session is valid", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "patient@gmail.com", role: "PATIENT" },
      expires: "",
    });

    const result = await withAuth();
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({
      userId: "user-1",
      email: "patient@gmail.com",
      role: "PATIENT",
    });
  });

  it("defaults email to empty string when null", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: null, role: "PATIENT" },
      expires: "",
    });

    const result = await withAuth();
    expect(result).not.toBeInstanceOf(NextResponse);
    const ctx = result as { email: string };
    expect(ctx.email).toBe("");
  });
});
