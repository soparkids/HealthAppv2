import { useState, useEffect } from "react";
import { orgApiFetch } from "@/lib/api";

interface ProviderStats {
  todayAppointments: number;
  totalPatients: number;
  activeAlerts: number;
  pendingLabResults: number;
}

const EMPTY_STATS: ProviderStats = {
  todayAppointments: 0,
  totalPatients: 0,
  activeAlerts: 0,
  pendingLabResults: 0,
};

export function useProviderStats(orgId: string | null) {
  const [data, setData] = useState<ProviderStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setData(EMPTY_STATS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      orgApiFetch<{ appointments?: unknown[]; pagination?: { total: number } }>("/appointments?limit=1", orgId).catch(() => ({ appointments: [], pagination: { total: 0 } })),
      orgApiFetch<{ patients?: unknown[]; pagination?: { total: number } }>("/patients?limit=1", orgId).catch(() => ({ pagination: { total: 0 } })),
      orgApiFetch<{ alerts?: unknown[] }>("/equipment/alerts?status=ACTIVE", orgId).catch(() => ({ alerts: [] })),
      orgApiFetch<{ results?: unknown[]; pagination?: { total: number } }>("/lab-results?limit=1", orgId).catch(() => ({ results: [], pagination: { total: 0 } })),
    ])
      .then(([appointmentsRes, patientsRes, alertsRes, labRes]) => {
        const totalAppointments =
          (appointmentsRes as { pagination?: { total: number } })?.pagination?.total ??
          (Array.isArray((appointmentsRes as { appointments?: unknown[] }).appointments)
            ? ((appointmentsRes as { appointments?: unknown[] }).appointments as unknown[]).length
            : 0);
        const totalPatients = (patientsRes as { pagination?: { total: number } })?.pagination?.total ?? 0;
        const alerts = Array.isArray(alertsRes) ? alertsRes : ((alertsRes as { alerts?: unknown[] })?.alerts || []);
        const pendingLabResults =
          (labRes as { pagination?: { total: number } })?.pagination?.total ??
          (Array.isArray((labRes as { results?: unknown[] }).results)
            ? ((labRes as { results?: unknown[] }).results as unknown[]).length
            : 0);

        setData({
          todayAppointments: totalAppointments,
          totalPatients,
          activeAlerts: Array.isArray(alerts) ? alerts.length : 0,
          pendingLabResults,
        });
      })
      .catch(() => {
        setError("Failed to load stats");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  return { data, loading, error };
}
