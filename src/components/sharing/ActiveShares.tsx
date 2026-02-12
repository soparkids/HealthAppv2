"use client";

import { useState, useEffect } from "react";
import { Trash2, ExternalLink, Clock, Shield, Download } from "lucide-react";

interface Share {
  id: string;
  sharedWithEmail: string;
  permission: "VIEW" | "DOWNLOAD";
  token: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface ActiveSharesProps {
  recordId: string;
  refreshKey: number;
}

export default function ActiveShares({ recordId, refreshKey }: ActiveSharesProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShares() {
      try {
        const res = await fetch(`/api/shares?recordId=${recordId}`);
        if (res.ok) {
          const data = await res.json();
          setShares(data);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchShares();
  }, [recordId, refreshKey]);

  async function revokeShare(shareId: string) {
    try {
      const res = await fetch(`/api/shares/${shareId}`, { method: "DELETE" });
      if (res.ok) {
        setShares(shares.filter((s) => s.id !== shareId));
      }
    } catch {
      // silently handle
    }
  }

  const activeShares = shares.filter(
    (s) =>
      !s.revokedAt &&
      (!s.expiresAt || new Date(s.expiresAt) > new Date())
  );

  if (loading) {
    return <p className="text-sm text-gray-400">Loading shares...</p>;
  }

  if (activeShares.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No active shares for this record.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Active Shares</h3>
      {activeShares.map((share) => (
        <div
          key={share.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {share.sharedWithEmail === "link-share" ? (
                <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <span className="text-sm text-gray-900 truncate">{share.sharedWithEmail}</span>
              )}
              {share.sharedWithEmail === "link-share" && (
                <span className="text-sm text-gray-900">Link Share</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                {share.permission === "DOWNLOAD" ? (
                  <Download className="w-3 h-3" />
                ) : (
                  <Shield className="w-3 h-3" />
                )}
                {share.permission === "DOWNLOAD" ? "View & Download" : "View Only"}
              </span>
              {share.expiresAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {new Date(share.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => revokeShare(share.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Revoke share"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
