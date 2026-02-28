"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  List,
  CalendarDays,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useRequireProviderRole } from "@/lib/hooks/use-require-role";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import CalendarView from "@/components/appointments/CalendarView";

type BadgeVariant = "default" | "primary" | "accent" | "danger" | "warning" | "success";

type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface Appointment {
  id: string;
  organizationId: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  doctor: string;
  reason: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
}

interface AppointmentsResponse {
  appointments: Appointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_BADGE_MAP: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: "Scheduled", variant: "primary" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  NO_SHOW: { label: "No Show", variant: "warning" },
};

const statusFilters: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

const ITEMS_PER_PAGE = 20;

export default function AppointmentsPage() {
  const { allowed, loading: roleLoading } = useRequireProviderRole();
  const { orgId, loading: orgLoading } = useOrganization();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const data = await orgApiFetch<AppointmentsResponse>(
        `/appointments?${params.toString()}`,
        orgId
      );
      setAppointments(data.appointments);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [orgId, currentPage, statusFilter]);

  // Fetch all appointments for calendar view (up to API max of 100)
  const fetchCalendarAppointments = useCallback(async () => {
    if (!orgId) return;
    setCalendarLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const data = await orgApiFetch<AppointmentsResponse>(
        `/appointments?${params.toString()}`,
        orgId
      );
      setCalendarAppointments(data.appointments);
    } catch {
      // silently handle
    } finally {
      setCalendarLoading(false);
    }
  }, [orgId, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (viewMode === "calendar") {
      fetchCalendarAppointments();
    }
  }, [viewMode, fetchCalendarAppointments]);

  if (roleLoading || !allowed || orgLoading || !orgId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredAppointments = searchQuery
    ? appointments.filter((appt) => {
        const q = searchQuery.toLowerCase();
        const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`.toLowerCase();
        return (
          patientName.includes(q) ||
          appt.doctor.toLowerCase().includes(q) ||
          (appt.reason && appt.reason.toLowerCase().includes(q))
        );
      })
    : appointments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          </div>
          <p className="text-sm text-gray-500">
            {total} appointment{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "calendar" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"
              }`}
              title="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push("/appointments/new")}
          >
            New Appointment
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full sm:max-w-xs">
            <Input
              placeholder="Search by patient, doctor, reason..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === filter.value
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        calendarLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <CalendarView
            appointments={searchQuery
              ? calendarAppointments.filter((appt) => {
                  const q = searchQuery.toLowerCase();
                  const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`.toLowerCase();
                  return (
                    patientName.includes(q) ||
                    appt.doctor.toLowerCase().includes(q) ||
                    (appt.reason && appt.reason.toLowerCase().includes(q))
                  );
                })
              : calendarAppointments
            }
            onAppointmentClick={(id) => router.push(`/appointments/${id}`)}
          />
        )
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-16 w-16" />}
              title="No appointments found"
              description="Try adjusting your filters, or schedule a new appointment."
              action={
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => router.push("/appointments/new")}
                >
                  New Appointment
                </Button>
              }
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Doctor
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Reason
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAppointments.map((appt) => {
                      const statusInfo = STATUS_BADGE_MAP[appt.status];
                      return (
                        <tr
                          key={appt.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/appointments/${appt.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-900">
                                {new Date(appt.appointmentDate).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-900">
                                {appt.appointmentTime}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {appt.patient.firstName} {appt.patient.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {appt.patient.patientNumber}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 hidden md:table-cell">
                            {appt.doctor}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                            {appt.reason || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Pagination (list view only) */}
      {viewMode === "list" && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
