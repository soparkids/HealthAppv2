"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  Filter,
  ArrowUpDown,
  Stethoscope,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface FollowUp {
  id: string;
  recommendation: string;
  status: "PENDING" | "SCHEDULED" | "COMPLETED" | "OVERDUE";
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  medicalRecord: {
    id: string;
    title: string;
    type: string;
  } | null;
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  SCHEDULED: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700",
    icon: CalendarClock,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: "Overdue",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
};

const doctorQuestions = [
  "What do these results mean for my overall health?",
  "Are there any lifestyle changes I should consider?",
  "When should I schedule my next follow-up scan?",
  "Should I be concerned about any of the findings?",
  "What are my treatment options based on these results?",
  "Is there anything I should monitor at home?",
];

type SortBy = "dueDate" | "createdAt";
type FilterStatus = "ALL" | "PENDING" | "SCHEDULED" | "COMPLETED" | "OVERDUE";

export default function CarePage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");

  useEffect(() => {
    async function fetchFollowUps() {
      try {
        setFetchError(null);
        const res = await fetch("/api/follow-ups");
        if (res.ok) {
          const data = await res.json();
          setFollowUps(data);
        } else {
          const data = await res.json().catch(() => ({}));
          setFetchError(data.error || "Failed to load follow-ups");
        }
      } catch {
        setFetchError("Network error — could not load follow-ups");
      } finally {
        setLoading(false);
      }
    }
    fetchFollowUps();
  }, []);

  const filtered = useMemo(() => {
    let items = [...followUps];

    if (filterStatus !== "ALL") {
      items = items.filter((f) => f.status === filterStatus);
    }

    items.sort((a, b) => {
      if (sortBy === "dueDate") {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDate - bDate;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return items;
  }, [followUps, filterStatus, sortBy]);

  const counts = useMemo(() => {
    const c = { PENDING: 0, SCHEDULED: 0, COMPLETED: 0, OVERDUE: 0 };
    for (const f of followUps) {
      c[f.status]++;
    }
    return c;
  }, [followUps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">MyCare Navigator</h1>
        </div>
        <p className="text-gray-500">
          Track your follow-up recommendations and manage your care journey.
        </p>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(Object.entries(statusConfig) as [keyof typeof statusConfig, (typeof statusConfig)[keyof typeof statusConfig]][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? "ALL" : key)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  filterStatus === key
                    ? "border-primary ring-2 ring-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">{config.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
              </button>
            );
          }
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Follow-up Recommendations
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-white"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <button
                onClick={() => setSortBy(sortBy === "dueDate" ? "createdAt" : "dueDate")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === "dueDate" ? "Due Date" : "Created"}
              </button>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((followUp) => {
                const cfg = statusConfig[followUp.status];
                const StatusIcon = cfg.icon;
                return (
                  <Link
                    key={followUp.id}
                    href={`/care/${followUp.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 mb-1">
                          {followUp.recommendation}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                          {followUp.medicalRecord && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {followUp.medicalRecord.title}
                            </span>
                          )}
                          {followUp.dueDate && (
                            <span>
                              Due: {new Date(followUp.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No follow-up recommendations found.</p>
            </div>
          )}

          {followUps.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Care Timeline
              </h2>
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
                {[...followUps]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )
                  .slice(0, 10)
                  .map((followUp) => {
                    const cfg = statusConfig[followUp.status];
                    const Ico = cfg.icon;
                    return (
                      <div key={followUp.id} className="relative">
                        <span className="absolute -left-[31px] w-4 h-4 rounded-full bg-white border-2 border-primary" />
                        <div className="text-xs text-gray-400 mb-1">
                          {new Date(followUp.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Ico className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {followUp.recommendation}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-teal-50 rounded-xl border border-teal-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-teal-900">
                Questions for Your Doctor
              </h3>
            </div>
            <p className="text-sm text-teal-700 mb-4">
              Consider asking these questions at your next appointment:
            </p>
            <ul className="space-y-3">
              {doctorQuestions.map((question, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-200 text-teal-700 flex items-center justify-center text-xs font-medium shrink-0">
                    {i + 1}
                  </span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
