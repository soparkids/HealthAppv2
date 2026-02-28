"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PROVIDER_ROLES = ["PROVIDER", "ADMIN", "OWNER", "DOCTOR", "NURSE", "RECEPTIONIST"];

/**
 * Hook that redirects to /dashboard if the user doesn't have a provider role.
 * Use as defense-in-depth on clinical pages (middleware already blocks, but this catches edge cases).
 */
export function useRequireProviderRole(): { allowed: boolean; loading: boolean } {
  const { data: session, status } = useSession();
  const router = useRouter();

  const loading = status === "loading";
  const role = session?.user?.role;
  const allowed = !!role && PROVIDER_ROLES.includes(role);

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace("/dashboard");
    }
  }, [loading, allowed, router]);

  return { allowed, loading };
}
