"use client";

import { OrgContext, useOrganizationProvider } from "@/lib/hooks/use-organization";

export default function OrgProvider({ children }: { children: React.ReactNode }) {
  const orgValue = useOrganizationProvider();
  return <OrgContext.Provider value={orgValue}>{children}</OrgContext.Provider>;
}
