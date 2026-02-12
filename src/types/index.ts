import type {
  User,
  MedicalRecord,
  Report,
  SharedRecord,
  FamilyMember,
  FollowUp,
  Provider,
  Notification,
  Role,
  RecordType,
  Permission,
  FollowUpStatus,
} from "@/generated/prisma/client";

export type {
  User,
  MedicalRecord,
  Report,
  SharedRecord,
  FamilyMember,
  FollowUp,
  Provider,
  Notification,
  Role,
  RecordType,
  Permission,
  FollowUpStatus,
};

export type MedicalRecordWithReport = MedicalRecord & {
  report?: Report | null;
};

export type MedicalRecordWithRelations = MedicalRecord & {
  report?: Report | null;
  sharedRecords?: SharedRecord[];
  followUps?: FollowUp[];
};

export type UserWithProvider = User & {
  provider?: Provider | null;
};

export type DashboardStats = {
  totalRecords: number;
  pendingFollowUps: number;
  sharedRecords: number;
  familyMembers: number;
};
