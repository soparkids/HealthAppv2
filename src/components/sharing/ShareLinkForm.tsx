"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";

interface ShareLinkFormProps {
  recordId: string;
  onShareCreated: () => void;
}

const expiryOptions = [
  { label: "24 hours", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "No expiry", value: 0 },
];

export default function ShareLinkForm({ recordId, onShareCreated }: ShareLinkFormProps) {
  const [expiryDays, setExpiryDays] = useState(7);
  const [permission, setPermission] = useState<"VIEW" | "DOWNLOAD">("VIEW");
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const expiresAt = expiryDays > 0
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicalRecordId: recordId,
          permission,
          expiresAt,
          sharedWithEmail: "link-share",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShareLink(`${window.location.origin}/shared/${data.token}`);
        onShareCreated();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Link Expiry
        </label>
        <select
          value={expiryDays}
          onChange={(e) => setExpiryDays(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {expiryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permission
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setPermission("VIEW")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              permission === "VIEW"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            View Only
          </button>
          <button
            onClick={() => setPermission("DOWNLOAD")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              permission === "DOWNLOAD"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            View & Download
          </button>
        </div>
      </div>

      {shareLink ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700 font-medium mb-2">Link created!</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 text-sm bg-white border border-green-300 rounded-lg p-2 text-gray-700"
            />
            <button
              onClick={handleCopy}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Link2 className="w-4 h-4" />
          {loading ? "Creating..." : "Create Share Link"}
        </button>
      )}
    </div>
  );
}
