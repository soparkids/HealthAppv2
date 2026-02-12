"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";

interface ShareEmailFormProps {
  recordId: string;
  onShareCreated: () => void;
}

export default function ShareEmailForm({ recordId, onShareCreated }: ShareEmailFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "DOWNLOAD">("VIEW");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicalRecordId: recordId,
          sharedWithEmail: email,
          permission,
          expiresAt,
          message,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setEmail("");
        setMessage("");
        onShareCreated();
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipient Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@example.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permission
        </label>
        <div className="flex gap-3">
          <button
            type="button"
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
            type="button"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note for the recipient..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Record shared successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {loading ? "Sharing..." : "Share via Email"}
      </button>
    </form>
  );
}
