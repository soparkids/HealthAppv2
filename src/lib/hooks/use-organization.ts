"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  createdAt: string;
}

interface OrgContextValue {
  organizations: Organization[];
  activeOrg: Organization | null;
  orgId: string | null;
  loading: boolean;
  setActiveOrg: (org: Organization) => void;
  refetch: () => void;
}

const OrgContext = createContext<OrgContextValue>({
  organizations: [],
  activeOrg: null,
  orgId: null,
  loading: true,
  setActiveOrg: () => {},
  refetch: () => {},
});

export function useOrganization() {
  return useContext(OrgContext);
}

export { OrgContext };

export function useOrganizationProvider(): OrgContextValue {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    apiFetch<{ organizations: Organization[] }>("/organizations")
      .then((data) => {
        setOrganizations(data.organizations);
        if (data.organizations.length > 0 && !activeOrg) {
          // Default to the org matching session or first org
          const sessionOrgId = session.user.activeOrganizationId;
          const match = data.organizations.find((o) => o.id === sessionOrgId);
          setActiveOrg(match || data.organizations[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id, session?.user?.activeOrganizationId, activeOrg]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  return {
    organizations,
    activeOrg,
    orgId: activeOrg?.id || null,
    loading,
    setActiveOrg,
    refetch: fetchOrgs,
  };
}
