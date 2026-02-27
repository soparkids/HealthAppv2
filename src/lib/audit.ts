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
  | "ENABLE_FEATURE"
  | "DISABLE_FEATURE"
  | "UPDATE_FEATURE"
  | "EXPORT_DATA"
  | "CREATE_PATIENT"
  | "UPDATE_PATIENT"
  | "DELETE_PATIENT"
  | "LINK_PATIENT_ACCOUNT"
  | "UPDATE_PATIENT_PREFIX"
  | "CREATE_APPOINTMENT"
  | "UPDATE_APPOINTMENT"
  | "DELETE_APPOINTMENT"
  | "CREATE_EYE_CONSULTATION"
  | "DELETE_EYE_CONSULTATION"
  | "CREATE_MEDICAL_HISTORY"
  | "CREATE_LAB_RESULT"
  | "DELETE_LAB_RESULT"
  | "INTERPRET_LAB_RESULT"
  | "VIEW_INTERPRETATION"
  | "CREATE_EQUIPMENT"
  | "UPDATE_EQUIPMENT"
  | "DELETE_EQUIPMENT"
  | "IMPORT_EQUIPMENT"
  | "CREATE_MAINTENANCE_LOG"
  | "CREATE_SENSOR_READING"
  | "PREDICT_EQUIPMENT_FAILURE"
  | "ACKNOWLEDGE_ALERT"
  | "RESOLVE_ALERT"
  | "DISMISS_ALERT";

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
