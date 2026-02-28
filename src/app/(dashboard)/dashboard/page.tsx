"use client";

import { useSession } from "next-auth/react";
import {
  FileText,
  Clock,
  Share2,
  Users,
  Upload,
  Eye,
  ArrowRight,
  Calendar,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ProviderDashboard from "@/components/dashboard/ProviderDashboard";
import { useRecords } from "@/lib/hooks/use-records";
import { useFollowUps } from "@/lib/hooks/use-follow-ups";
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats";
import { RECORD_TYPE_DISPLAY, RECORD_TYPE_COLORS } from "@/lib/api";

type BadgeVariant = "default" | "primary" | "accent" | "danger" | "warning" | "success";

export default function DashboardPage() {
  const { data: session } = useSession();

  const userName = session?.user?.name?.split(" ")[0] || "there";
  const userRole = session?.user?.role;
  const hasOrg = !!session?.user?.activeOrganizationId;

  // Show provider dashboard for PROVIDER role with an active org
  if (userRole === "PROVIDER" && hasOrg) {
    return <ProviderDashboard userName={userName} />;
  }

  // Patient dashboard (default)
  return <PatientDashboard userName={userName} />;
}

function PatientDashboard({ userName }: { userName: string }) {
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { data: recordsData, loading: recordsLoading } = useRecords({ limit: 6 });
  const { data: followUps, loading: followUpsLoading } = useFollowUps();

  const recentRecords = recordsData?.records || [];
  const upcomingFollowUps = followUps
    .filter((f) => f.status === "PENDING" || f.status === "SCHEDULED")
    .slice(0, 3);

  const statCards = [
    {
      label: "Total Records",
      value: stats.totalRecords,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary-light",
    },
    {
      label: "Pending Follow-ups",
      value: stats.pendingFollowUps,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning-light",
    },
    {
      label: "Shared Records",
      value: stats.sharedRecords,
      icon: Share2,
      color: "text-accent",
      bg: "bg-accent-light",
    },
    {
      label: "Family Members",
      value: stats.familyMembers,
      icon: Users,
      color: "text-success",
      bg: "bg-success-light",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
        <p className="mt-1 text-white/80">
          Here is an overview of your health records and upcoming appointments.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="h-4 w-4" />}
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            onClick={() => (window.location.href = "/records/upload")}
          >
            Upload Record
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Share2 className="h-4 w-4" />}
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="h-4 w-4" />}
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            onClick={() => (window.location.href = "/records")}
          >
            View Reports
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardBody className="flex items-center gap-3 sm:gap-4">
                <div className={`rounded-lg p-2.5 sm:p-3 ${stat.bg} shrink-0`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  {statsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Records
              </h2>
              <a
                href="/records"
                className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </a>
            </CardHeader>
            <CardBody>
              {recordsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : recentRecords.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No records yet. Upload your first medical record to get started.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentRecords.map((record) => (
                    <a
                      key={record.id}
                      href={`/records/${record.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {record.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              (RECORD_TYPE_COLORS[record.type] as BadgeVariant) ||
                              "default"
                            }
                          >
                            {RECORD_TYPE_DISPLAY[record.type] || record.type}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(record.recordDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* Upcoming Follow-ups */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Upcoming Follow-ups
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {followUpsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : upcomingFollowUps.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming follow-ups.
                </p>
              ) : (
                upcomingFollowUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="rounded-lg bg-warning-light p-2 mt-0.5">
                      <Calendar className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fu.recommendation}
                      </p>
                      {fu.medicalRecord && (
                        <p className="text-xs text-gray-500">
                          {fu.medicalRecord.title}
                        </p>
                      )}
                      {fu.dueDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(fu.dueDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h2>
            </CardHeader>
            <CardBody>
              {recordsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : recentRecords.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentRecords.slice(0, 5).map((record, i, arr) => (
                    <div key={record.id} className="flex items-start gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                        {i < arr.length - 1 && (
                          <div className="w-px h-full bg-gray-200 absolute top-3" />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Added</span>{" "}
                          {record.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
