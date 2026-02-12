"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Trash2,
} from "lucide-react";

interface FollowUpDetail {
  id: string;
  recommendation: string;
  status: "PENDING" | "SCHEDULED" | "COMPLETED" | "OVERDUE";
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  medicalRecord: {
    id: string;
    title: string;
    type: string;
    recordDate: string;
  } | null;
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  SCHEDULED: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CalendarClock,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: "Overdue",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
};

export default function FollowUpDetailPage() {
  const params = useParams();
  const router = useRouter();
  const followUpId = params.id as string;
  const [followUp, setFollowUp] = useState<FollowUpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchFollowUp() {
      try {
        const res = await fetch(`/api/follow-ups/${followUpId}`);
        if (res.ok) {
          const data = await res.json();
          setFollowUp(data);
          setNotes(data.notes || "");
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchFollowUp();
  }, [followUpId]);

  async function updateStatus(status: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFollowUp(updated);
      }
    } finally {
      setUpdating(false);
    }
  }

  async function saveNotes() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFollowUp(updated);
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this follow-up?")) return;
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/care");
      }
    } catch {
      // silently handle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!followUp) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">Follow-up not found.</p>
          <Link
            href="/care"
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Care Navigator
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[followUp.status];
  const StatusIcon = config.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/care"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Care Navigator
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {followUp.recommendation}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>
                Created: {new Date(followUp.createdAt).toLocaleDateString()}
              </span>
              {followUp.dueDate && (
                <span>
                  Due: {new Date(followUp.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${config.color}`}
          >
            <StatusIcon className="w-4 h-4" />
            {config.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {followUp.status !== "SCHEDULED" && (
            <button
              onClick={() => updateStatus("SCHEDULED")}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <CalendarClock className="w-4 h-4" />
              Schedule
            </button>
          )}
          {followUp.status !== "COMPLETED" && (
            <button
              onClick={() => updateStatus("COMPLETED")}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Complete
            </button>
          )}
          {followUp.status !== "PENDING" && followUp.status !== "COMPLETED" && (
            <button
              onClick={() => updateStatus("PENDING")}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Snooze
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {followUp.medicalRecord && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Related Medical Record
          </h2>
          <Link
            href={`/records/${followUp.medicalRecord.id}`}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">
                {followUp.medicalRecord.title}
              </p>
              <p className="text-sm text-gray-500">
                {followUp.medicalRecord.type.replace("_", " ")} -{" "}
                {new Date(followUp.medicalRecord.recordDate).toLocaleDateString()}
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add personal notes about this follow-up..."
          rows={4}
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={saveNotes}
            disabled={updating || notes === (followUp.notes || "")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
