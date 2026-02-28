"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  HeartPulse,
  Users,
  Activity,
  UserPlus,
  Calendar,
  TestTube,
  Eye,
  Settings,
  Wrench,
  X,
  ClipboardList,
  ChevronDown,
  Check,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  providerOnly?: boolean;
  patientOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: UserPlus, providerOnly: true },
  { href: "/appointments", label: "Appointments", icon: Calendar, providerOnly: true },
  { href: "/lab-results", label: "Lab Results", icon: TestTube, providerOnly: true },
  { href: "/eye-consultations", label: "Eye Consult", icon: Eye, providerOnly: true },
  { href: "/equipment", label: "Equipment", icon: Wrench, providerOnly: true },
  { href: "/my-results", label: "My Results", icon: ClipboardList, patientOnly: true },
  { href: "/records", label: "Records", icon: FolderOpen },
  { href: "/care", label: "Care", icon: HeartPulse },
  { href: "/family", label: "Family", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
}

function OrgSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.activeOrganizationId) return;
    fetch("/api/auth/switch-org")
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations || []))
      .catch(() => {});
  }, [session?.user?.activeOrganizationId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!session?.user?.activeOrganizationId || orgs.length === 0) return null;

  const activeOrg = orgs.find((o) => o.isActive) || orgs[0];

  async function switchOrg(orgId: string) {
    if (orgId === activeOrg?.id || switching) return;
    setSwitching(true);
    setOpen(false);
    try {
      await fetch("/api/auth/switch-org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setSwitching(false);
    }
  }

  if (orgs.length === 1) {
    return (
      <div className="px-3 py-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-medium text-gray-700">{activeOrg.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3 mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 shrink-0 text-gray-500" />
        <span className="flex-1 text-left truncate">{activeOrg?.name || "Select org"}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span className="flex-1 truncate font-medium text-gray-700">{org.name}</span>
              {org.isActive && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isProvider = session?.user?.role === "PROVIDER";
  const hasOrg = !!session?.user?.activeOrganizationId;

  const filteredItems = navItems.filter((item) => {
    if (item.providerOnly && !(isProvider && hasOrg)) return false;
    if (item.patientOnly && isProvider) return false;
    return true;
  });

  return (
    <nav className="space-y-1">
      {filteredItems.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary-light text-primary"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-64px)] sticky top-16 shrink-0 hidden lg:block">
        <div className="p-4">
          <div className="flex items-center gap-2 px-3 py-2 mb-4">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-gray-900">NdụMed</span>
          </div>
          <OrgSwitcher />
          <NavLinks />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={close}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <aside
            className="fixed top-0 left-0 w-72 h-full bg-white shadow-xl z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="p-4">
              <div className="flex items-center justify-between px-3 py-2 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-7 w-7 text-primary" />
                  <span className="text-xl font-bold text-gray-900">NdụMed</span>
                </div>
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <OrgSwitcher />
              <NavLinks onNavigate={close} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
