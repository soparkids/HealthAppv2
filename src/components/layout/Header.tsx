"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Search, ChevronDown, LogOut, Settings, User, Menu } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import NotificationBell from "./NotificationBell";
import { useSidebar } from "./SidebarContext";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toggle } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userName = session?.user?.name || "User";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/records?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearch} className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search records, reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-colors"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile search button */}
        <button
          onClick={() => {
            if (searchQuery.trim()) {
              router.push(`/records?search=${encodeURIComponent(searchQuery.trim())}`);
            } else {
              router.push("/records?search=");
            }
          }}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors sm:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Avatar name={userName} size="sm" />
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {userName}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-gray-50 w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
