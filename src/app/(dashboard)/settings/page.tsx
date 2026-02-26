"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Users,
  ToggleLeft,
  ToggleRight,
  ScrollText,
  Plus,
  Trash2,
  Shield,
  Building2,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

type OrgRole = "OWNER" | "ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST";

interface FeatureFlag {
  featureKey: string;
  enabled: boolean;
}

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: OrgRole;
  joinedAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string | null;
  details: string | null;
  createdAt: string;
}

type SettingsTab = "info" | "features" | "members" | "audit";

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  eye_consultation: "Eye consultation and exam module",
  appointments: "Appointment scheduling",
  predictive_maintenance: "Equipment predictive maintenance",
  ai_interpretation: "AI-powered lab result interpretation",
  family_management: "Family member management",
  report_sharing: "Medical record sharing",
  follow_ups: "Follow-up tracking",
  provider_portal: "Healthcare provider portal",
  lab_results: "Lab results management",
  medical_history: "Medical history tracking",
};

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  eye_consultation: "Eye Consultation",
  appointments: "Appointments",
  predictive_maintenance: "Predictive Maintenance",
  ai_interpretation: "AI Interpretation",
  family_management: "Family Management",
  report_sharing: "Report Sharing",
  follow_ups: "Follow-ups",
  provider_portal: "Provider Portal",
  lab_results: "Lab Results",
  medical_history: "Medical History",
};

const ROLE_BADGE_VARIANTS: Record<OrgRole, "primary" | "accent" | "success" | "warning" | "default"> = {
  OWNER: "primary",
  ADMIN: "accent",
  DOCTOR: "success",
  NURSE: "warning",
  RECEPTIONIST: "default",
};

const ALL_ROLES: OrgRole[] = ["OWNER", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { orgId, activeOrg, organizations, loading: orgLoading } = useOrganization();
  const canCreateOrg = session?.user?.role === "PROVIDER" || session?.user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<SettingsTab>("info");

  // Feature flags state
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featureTogglingKey, setFeatureTogglingKey] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<OrgRole>("DOCTOR");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<{ id: string; role: OrgRole } | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const isPrivileged = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN";

  const fetchFeatures = useCallback(async () => {
    if (!orgId) return;
    setFeaturesLoading(true);
    try {
      const data = await orgApiFetch<{ features: FeatureFlag[] }>(
        `/organizations/${orgId}/features`,
        orgId
      );
      setFeatures(data.features);
    } catch {
      setError("Failed to load feature flags.");
    } finally {
      setFeaturesLoading(false);
    }
  }, [orgId]);

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setMembersLoading(true);
    try {
      const data = await orgApiFetch<{ members: Member[] }>(
        `/organizations/${orgId}/members`,
        orgId
      );
      setMembers(data.members);
    } catch {
      setError("Failed to load members.");
    } finally {
      setMembersLoading(false);
    }
  }, [orgId]);

  const fetchAuditLogs = useCallback(async () => {
    if (!orgId) return;
    setAuditLoading(true);
    try {
      const data = await orgApiFetch<{ logs: AuditLogEntry[] }>(
        `/organizations/${orgId}/audit-logs`,
        orgId
      );
      setAuditLogs(data.logs);
    } catch {
      setError("Failed to load audit logs.");
    } finally {
      setAuditLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    if (activeTab === "features") fetchFeatures();
    if (activeTab === "members") fetchMembers();
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab, orgId, fetchFeatures, fetchMembers, fetchAuditLogs]);

  const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!orgId || !isPrivileged) return;
    setFeatureTogglingKey(featureKey);
    setError(null);
    try {
      await orgApiFetch(`/organizations/${orgId}/features`, orgId, {
        method: "PUT",
        body: JSON.stringify({ featureKey, enabled: !enabled }),
      });
      setFeatures((prev) =>
        prev.map((f) =>
          f.featureKey === featureKey ? { ...f, enabled: !enabled } : f
        )
      );
    } catch {
      setError("Failed to toggle feature.");
    } finally {
      setFeatureTogglingKey(null);
    }
  };

  const handleAddMember = async () => {
    if (!orgId || !newMemberEmail) return;
    setAddingMember(true);
    setError(null);
    try {
      await orgApiFetch(`/organizations/${orgId}/members`, orgId, {
        method: "POST",
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      });
      setAddMemberOpen(false);
      setNewMemberEmail("");
      setNewMemberRole("DOCTOR");
      fetchMembers();
    } catch {
      setError("Failed to add member. Check the email address and try again.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId || !isPrivileged) return;
    setRemovingMemberId(memberId);
    setError(null);
    try {
      await orgApiFetch(`/organizations/${orgId}/members/${memberId}`, orgId, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      setError("Failed to remove member.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleUpdateRole = async (memberId: string, role: OrgRole) => {
    if (!orgId || !isPrivileged) return;
    setError(null);
    try {
      await orgApiFetch(`/organizations/${orgId}/members/${memberId}`, orgId, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
      setEditingMember(null);
    } catch {
      setError("Failed to update role.");
    }
  };

  // No org state
  if (orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!orgId || organizations.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canCreateOrg ? "Create an organization to get started." : "You are not part of any organization yet."}
          </p>
        </div>
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title="No Organization"
          description={canCreateOrg
            ? "You are not part of any organization yet. Create one to start managing your team and features."
            : "You are not part of any organization yet. Ask your healthcare provider to add you to their organization."}
          action={canCreateOrg ? (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/settings/create-org")}
            >
              Create Organization
            </Button>
          ) : undefined}
        />
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "info", label: "Organization", icon: <Building2 className="h-4 w-4" /> },
    { id: "features", label: "Features", icon: <ToggleLeft className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    { id: "audit", label: "Audit Log", icon: <ScrollText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your organization, features, and team.
          </p>
        </div>
        {isPrivileged && (
          <Badge variant="primary">
            <Shield className="h-3 w-3 mr-1" />
            {activeOrg?.role}
          </Badge>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
          <button
            className="ml-2 underline text-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Organization Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Name
                </label>
                <p className="text-sm text-gray-900 font-medium">
                  {activeOrg?.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Slug
                </label>
                <p className="text-sm text-gray-900 font-mono">
                  {activeOrg?.slug}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Your Role
                </label>
                <Badge variant={ROLE_BADGE_VARIANTS[activeOrg?.role as OrgRole] || "default"}>
                  {activeOrg?.role}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Members
                </label>
                <p className="text-sm text-gray-900">{activeOrg?.memberCount}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {activeOrg?.createdAt
                    ? new Date(activeOrg.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            {canCreateOrg && (
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/settings/create-org")}
              >
                Create New Organization
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {activeTab === "features" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Feature Flags
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Enable or disable features for your organization.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {featuresLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : features.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No feature flags available.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {features.map((feature) => (
                  <div
                    key={feature.featureKey}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {FEATURE_DISPLAY_NAMES[feature.featureKey] || feature.featureKey}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {FEATURE_DESCRIPTIONS[feature.featureKey] || "No description available."}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleToggleFeature(feature.featureKey, feature.enabled)
                      }
                      disabled={!isPrivileged || featureTogglingKey === feature.featureKey}
                      className={`ml-4 shrink-0 transition-colors ${
                        !isPrivileged ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title={
                        isPrivileged
                          ? `Toggle ${feature.featureKey}`
                          : "Only OWNER or ADMIN can toggle features"
                      }
                    >
                      {featureTogglingKey === feature.featureKey ? (
                        <Spinner size="sm" />
                      ) : feature.enabled ? (
                        <ToggleRight className="h-7 w-7 text-success" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-gray-300" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "members" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Team Members
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {members.length} member{members.length !== 1 ? "s" : ""} in this organization.
                </p>
              </div>
              {isPrivileged && (
                <Button
                  size="sm"
                  icon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setAddMemberOpen(true)}
                >
                  Add Member
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {membersLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No members found.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {(member.name || member.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name || member.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {editingMember?.id === member.id ? (
                          <select
                            value={editingMember.role}
                            onChange={(e) =>
                              setEditingMember({
                                ...editingMember,
                                role: e.target.value as OrgRole,
                              })
                            }
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            {ALL_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={ROLE_BADGE_VARIANTS[member.role] || "default"}>
                            {member.role}
                          </Badge>
                        )}
                        {isPrivileged && member.role !== "OWNER" && (
                          <div className="flex items-center gap-1">
                            {editingMember?.id === member.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() =>
                                    handleUpdateRole(member.id, editingMember.role)
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingMember(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setEditingMember({
                                      id: member.id,
                                      role: member.role,
                                    })
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  loading={removingMemberId === member.id}
                                  icon={<Trash2 className="h-3 w-3" />}
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  Remove
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Add Member Modal */}
          <Modal
            open={addMemberOpen}
            onClose={() => setAddMemberOpen(false)}
            title="Add Team Member"
          >
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as OrgRole)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {ALL_ROLES.filter((r) => r !== "OWNER").map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                  Cancel
                </Button>
                <Button
                  loading={addingMember}
                  disabled={!newMemberEmail}
                  onClick={handleAddMember}
                >
                  Add Member
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Recent activity in your organization.
            </p>
          </CardHeader>
          <CardBody>
            {auditLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No audit logs available yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Details
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3">
                          <Badge variant="default">{log.action}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {log.userName || log.userId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                          {log.details || "--"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
