"use client";

import { useState } from "react";
import { ChevronDown, Building2, Check, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useOrganization, type Organization } from "@/lib/hooks/use-organization";

export default function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrg, loading } = useOrganization();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="px-3 py-2 mb-4 animate-pulse">
        <div className="h-9 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!activeOrg && organizations.length === 0) {
    return (
      <Link
        href="/settings/create-org"
        className="flex items-center gap-2 px-3 py-2 mb-4 text-sm text-primary hover:bg-primary-light rounded-lg transition-colors"
      >
        <PlusCircle className="h-4 w-4 shrink-0" />
        <span className="font-medium">Create Organization</span>
      </Link>
    );
  }

  if (!activeOrg) return null;

  function handleSelect(org: Organization) {
    setActiveOrg(org);
    setOpen(false);
    // Reload page so org-scoped data refreshes
    window.location.reload();
  }

  return (
    <div className="relative px-3 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{activeOrg.name}</p>
          <p className="text-xs text-gray-400 capitalize">{activeOrg.role.toLowerCase()}</p>
        </div>
        {organizations.length > 1 && (
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && organizations.length > 1 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-3 right-3 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20"
            role="listbox"
            aria-label="Select organization"
          >
            {organizations.map((org) => (
              <button
                key={org.id}
                role="option"
                aria-selected={org.id === activeOrg.id}
                onClick={() => handleSelect(org)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{org.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{org.role.toLowerCase()}</p>
                </div>
                {org.id === activeOrg.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}
            <hr className="my-1 border-gray-100" />
            <Link
              href="/settings/create-org"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <PlusCircle className="h-4 w-4" />
              New Organization
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
