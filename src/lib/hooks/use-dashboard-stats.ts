import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface DashboardStats {
  totalRecords: number;
  pendingFollowUps: number;
  sharedRecords: number;
  familyMembers: number;
}

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats>({
    totalRecords: 0,
    pendingFollowUps: 0,
    sharedRecords: 0,
    familyMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ pagination: { total: number } }>("/records?limit=1"),
      apiFetch<Array<{ status: string }>>("/follow-ups"),
      apiFetch<unknown[]>("/shares"),
      apiFetch<unknown[]>("/family"),
    ])
      .then(([recordsRes, followUps, shares, family]) => {
        setData({
          totalRecords: recordsRes.pagination.total,
          pendingFollowUps: followUps.filter(
            (f) => f.status === "PENDING" || f.status === "SCHEDULED",
          ).length,
          sharedRecords: shares.length,
          familyMembers: family.length,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
