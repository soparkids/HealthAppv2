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
