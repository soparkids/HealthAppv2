"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Users,
  FileText,
  Clock,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface ProviderDashboardData {
  totalPatients: number;
  pendingReviews: number;
  recentShares: {
    id: string;
    createdAt: string;
    sharedBy: {
      name: string | null;
      email: string;
    };
    medicalRecord: {
      id: string;
      title: string;
      type: string;
    };
  }[];
}

export default function ProviderPage() {
  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/providers/dashboard");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Patients",
      value: data?.totalPatients ?? 0,
      icon: Users,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Pending Reviews",
      value: data?.pendingReviews ?? 0,
      icon: Clock,
      color: "text-yellow-600 bg-yellow-100",
    },
    {
      label: "Recent Shares",
      value: data?.recentShares?.length ?? 0,
      icon: FileText,
      color: "text-teal-600 bg-teal-100",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Provider Portal</h1>
        </div>
        <p className="text-gray-500">
          View shared records and manage your patient list.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Shares</h2>
            <Link
              href="/provider/patients"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          {data?.recentShares && data.recentShares.length > 0 ? (
            <div className="space-y-3">
              {data.recentShares.slice(0, 5).map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {share.medicalRecord.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      From: {share.sharedBy.name || share.sharedBy.email} -{" "}
                      {new Date(share.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">
                    {share.medicalRecord.type.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No shared records received yet.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              href="/provider/patients"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  View Patient List
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/providers/search"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-900">
                  Find Providers
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
