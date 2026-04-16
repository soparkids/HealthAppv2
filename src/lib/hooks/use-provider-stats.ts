import { useState, useEffect } from "react";
import { orgApiFetch } from "@/lib/api";

interface ProviderStats {
  totalPatients: number;
  totalAppointments: number;
  totalLabResults: number;
  eyeConsultations: number;
  activeAlerts: number;
}

const EMPTY_STATS: ProviderStats = {
  totalPatients: 0,
  totalAppointments: 0,
  totalLabResults: 0,
  eyeConsultations: 0,
  activeAlerts: 0,
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
      orgApiFetch<{ pagination?: { total: number } }>("/patients?limit=1", orgId).catch(() => ({ pagination: { total: 0 } })),
      orgApiFetch<{ pagination?: { total: number } }>("/appointments?limit=1", orgId).catch(() => ({ pagination: { total: 0 } })),
      orgApiFetch<{ pagination?: { total: number } }>("/lab-results?limit=1", orgId).catch(() => ({ pagination: { total: 0 } })),
      orgApiFetch<{ pagination?: { total: number } }>("/eye-consultations?limit=1", orgId).catch(() => ({ pagination: { total: 0 } })),
      orgApiFetch<{ alerts?: unknown[] }>("/equipment/alerts?status=ACTIVE", orgId).catch(() => ({ alerts: [] })),
    ])
      .then(([patientsRes, apptsRes, labRes, eyeRes, alertsRes]) => {
        const totalPatients = patientsRes.pagination?.total ?? 0;
        const totalAppointments = apptsRes.pagination?.total ?? 0;
        const totalLabResults = labRes.pagination?.total ?? 0;
        const eyeConsultations = eyeRes.pagination?.total ?? 0;
        const alerts = Array.isArray(alertsRes) ? alertsRes : ((alertsRes as { alerts?: unknown[] })?.alerts || []);

        setData({
          totalPatients,
          totalAppointments,
          totalLabResults,
          eyeConsultations,
          activeAlerts: Array.isArray(alerts) ? alerts.length : 0,
        });
      })
      .catch(() => {
        setError("Failed to load stats");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  return { data, loading, error };
}
