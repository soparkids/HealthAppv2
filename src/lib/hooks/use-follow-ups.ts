import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export interface FollowUp {
  id: string;
  recommendation: string;
  status: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  medicalRecord?: {
    id: string;
    title: string;
    type: string;
  } | null;
}

export function useFollowUps() {
  const [data, setData] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<FollowUp[]>("/follow-ups")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
