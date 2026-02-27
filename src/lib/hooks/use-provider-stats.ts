import { useState, useEffect } from "react";
import { orgApiFetch } from "@/lib/api";

interface ProviderStats {
  todayAppointments: number;
  totalPatients: number;
  activeAlerts: number;
  pendingLabResults: number;
}

export function useProviderStats(orgId: string | null) {
  const [data, setData] = useState<ProviderStats>({
    todayAppointments: 0,
    totalPatients: 0,
    activeAlerts: 0,
    pendingLabResults: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      orgApiFetch<{ appointments?: unknown[] }>(`/appointments?date=${today}`, orgId).catch(() => ({ appointments: [] })),
      orgApiFetch<{ patients?: unknown[]; pagination?: { total: number } }>("/patients?limit=1", orgId).catch(() => ({ pagination: { total: 0 } })),
      orgApiFetch<{ alerts?: unknown[] }>("/equipment/alerts?status=ACTIVE", orgId).catch(() => ({ alerts: [] })),
      orgApiFetch<{ labResults?: unknown[] }>("/lab-results?limit=1", orgId).catch(() => ({ labResults: [] })),
    ])
      .then(([appointmentsRes, patientsRes, alertsRes, labRes]) => {
        const appointments = Array.isArray(appointmentsRes) ? appointmentsRes : (appointmentsRes?.appointments || []);
        const totalPatients = (patientsRes as { pagination?: { total: number } })?.pagination?.total ?? 0;
        const alerts = Array.isArray(alertsRes) ? alertsRes : (alertsRes?.alerts || []);
        const labResults = Array.isArray(labRes) ? labRes : (labRes?.labResults || []);

        setData({
          todayAppointments: Array.isArray(appointments) ? appointments.length : 0,
          totalPatients,
          activeAlerts: Array.isArray(alerts) ? alerts.length : 0,
          pendingLabResults: Array.isArray(labResults) ? labResults.length : 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  return { data, loading };
}
