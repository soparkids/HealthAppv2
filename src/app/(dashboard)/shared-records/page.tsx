"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, ExternalLink, Shield, Download, Trash2, ArrowRight } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";

interface ShareRow {
  id: string;
  medicalRecordId: string;
  sharedWithEmail: string;
  permission: "VIEW" | "DOWNLOAD";
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  medicalRecord: { id: string; title: string; type: string } | null;
}

export default function SharedRecordsPage() {
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ShareRow[]>("/shares");
      setShares(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load shares");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke(id: string) {
    setRevoking(id);
    try {
      await apiFetch(`/shares/${id}`, { method: "DELETE" });
      setShares((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  }

  const active = shares.filter(
    (s) =>
      !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt) > new Date())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Records</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage links and email invitations you&apos;ve sent to providers.
          </p>
        </div>
        <Link
          href="/records"
          className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary-hover px-4 py-2 text-sm"
        >
          Go to medical records <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-danger-light p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Active shares</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={<Share2 className="h-10 w-10 text-gray-300" />}
              title="No active shares"
              description="Open a medical record and use Share to invite a provider or create a link."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {active.map((s) => (
                <li
                  key={s.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.medicalRecord?.title || "Medical record"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {s.sharedWithEmail === "link-share" ? (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Link share
                          </>
                        ) : (
                          s.sharedWithEmail
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        {s.permission === "DOWNLOAD" ? (
                          <Download className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                        {s.permission === "DOWNLOAD" ? "View & download" : "View only"}
                      </span>
                      {s.expiresAt && (
                        <span>
                          Expires{" "}
                          {new Date(s.expiresAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.medicalRecord && (
                      <Link
                        href={`/records/${s.medicalRecord.id}`}
                        className="text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        View record
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      loading={revoking === s.id}
                      onClick={() => revoke(s.id)}
                      className="text-danger border-danger/30 hover:bg-danger/5"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Trash2 className="h-4 w-4" />
                        Revoke
                      </span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
