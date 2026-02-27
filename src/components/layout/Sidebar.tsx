"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isProvider = session?.user?.role === "PROVIDER";
  const hasOrg = !!session?.user?.activeOrganizationId;

  const filteredItems = navItems.filter((item) => {
    if (item.providerOnly && !(isProvider && hasOrg)) return false;
    if (item.patientOnly && isProvider && hasOrg) return false;
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
          <div className="flex items-center gap-2 px-3 py-2 mb-6">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-gray-900">NdụMed</span>
          </div>
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
          />
          {/* Slide-in panel */}
          <aside className="fixed top-0 left-0 w-72 h-full bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between px-3 py-2 mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-7 w-7 text-primary" />
                  <span className="text-xl font-bold text-gray-900">NdụMed</span>
                </div>
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks onNavigate={close} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
