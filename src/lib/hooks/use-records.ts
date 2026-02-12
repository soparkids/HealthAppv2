import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface MedicalRecord {
  id: string;
  title: string;
  type: string;
  bodyPart: string | null;
  facility: string | null;
  referringPhysician: string | null;
  recordDate: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  notes: string | null;
  createdAt: string;
  report?: {
    id: string;
    content: string;
    summary: string | null;
    keyFindings: string | null;
  } | null;
  sharedRecords?: Array<{
    id: string;
    sharedWithEmail: string;
    permission: string;
    token: string;
    expiresAt: string | null;
    revokedAt: string | null;
    createdAt: string;
  }>;
  followUps?: Array<{
    id: string;
    recommendation: string;
    status: string;
    dueDate: string | null;
  }>;
}

export interface PaginatedRecords {
  records: MedicalRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useRecords(params?: {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  const [data, setData] = useState<PaginatedRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    setError(null);

    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.type && params.type !== "All")
      searchParams.set("type", params.type);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    apiFetch<PaginatedRecords>(`/records${query ? `?${query}` : ""}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params?.search, params?.type, params?.page, params?.limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { data, loading, error, refetch: fetchRecords };
}

export function useRecord(id: string) {
  const [data, setData] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<MedicalRecord>(`/records/${id}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}
