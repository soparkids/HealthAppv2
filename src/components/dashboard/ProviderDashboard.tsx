"use client";

import Link from "next/link";
import {
  Calendar,
  UserPlus,
  AlertTriangle,
  TestTube,
  Users,
  ArrowRight,
  Wrench,
  Activity,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { useProviderStats } from "@/lib/hooks/use-provider-stats";
import { useOrganization } from "@/lib/hooks/use-organization";

export default function ProviderDashboard({ userName }: { userName: string }) {
  const { activeOrg, orgId } = useOrganization();
  const { data: stats, loading } = useProviderStats(orgId);

  const statCards = [
    {
      label: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary-light",
      href: "/appointments",
    },
    {
      label: "Total Patients",
      value: stats.totalPatients,
      icon: Users,
      color: "text-accent",
      bg: "bg-accent-light",
      href: "/patients",
    },
    {
      label: "Equipment Alerts",
      value: stats.activeAlerts,
      icon: AlertTriangle,
      color: stats.activeAlerts > 0 ? "text-danger" : "text-success",
      bg: stats.activeAlerts > 0 ? "bg-danger/10" : "bg-success-light",
      href: "/equipment/alerts",
    },
    {
      label: "Lab Results",
      value: stats.pendingLabResults,
      icon: TestTube,
      color: "text-warning",
      bg: "bg-warning-light",
      href: "/lab-results",
    },
  ];

  const quickActions = [
    { label: "New Patient", icon: UserPlus, href: "/patients/new" },
    { label: "New Appointment", icon: Calendar, href: "/appointments/new" },
    { label: "Add Lab Result", icon: TestTube, href: "/lab-results/new" },
    { label: "Register Equipment", icon: Wrench, href: "/equipment/new" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
            {activeOrg && (
              <p className="mt-1 text-white/80">
                {activeOrg.name} &middot; {activeOrg.role}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-white/60" />
            <span className="text-sm text-white/80">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody className="flex items-center gap-3 sm:gap-4">
                  <div className={`rounded-lg p-2.5 sm:p-3 ${stat.bg} shrink-0`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    {loading ? (
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
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-light/50 transition-colors cursor-pointer">
                    <div className="rounded-lg bg-primary-light p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">
                      {action.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Panel */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Patients</h2>
            <Link
              href="/patients"
              className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-500 text-center py-6">
              Your recent patient activity will appear here.
            </p>
          </CardBody>
        </Card>

        {/* Equipment Alerts Panel */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Equipment Alerts</h2>
            <Link
              href="/equipment/alerts"
              className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardBody>
            {stats.activeAlerts > 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/5 border border-danger/20">
                <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-danger">{stats.activeAlerts}</span> equipment
                  alert{stats.activeAlerts !== 1 ? "s" : ""} require attention.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                <Activity className="h-5 w-5 text-success shrink-0" />
                <p className="text-sm text-gray-700">
                  All equipment is operating normally.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
