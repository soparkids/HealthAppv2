"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Stethoscope,
  FileText,
  StickyNote,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

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

const STATUS_BADGE_MAP: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: "Scheduled", variant: "primary" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  NO_SHOW: { label: "No Show", variant: "warning" },
};

export default function AppointmentDetailPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);

  const fetchAppointment = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await orgApiFetch<Appointment>(
        `/appointments/${appointmentId}`,
        orgId
      );
      setAppointment(data);
      setEditNotes(data.notes || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointment.");
    } finally {
      setLoading(false);
    }
  }, [orgId, appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const updateStatus = async (status: AppointmentStatus) => {
    if (!orgId || !appointment) return;
    setUpdating(true);
    try {
      const data = await orgApiFetch<Appointment>(
        `/appointments/${appointmentId}`,
        orgId,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );
      setAppointment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!orgId || !appointment) return;
    setUpdating(true);
    try {
      const data = await orgApiFetch<Appointment>(
        `/appointments/${appointmentId}`,
        orgId,
        {
          method: "PUT",
          body: JSON.stringify({ notes: editNotes }),
        }
      );
      setAppointment(data);
      setShowNotesInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notes.");
    } finally {
      setUpdating(false);
    }
  };

  if (orgLoading || !orgId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="py-12">
        <EmptyState
          title="Appointment not found"
          description={error || "The requested appointment could not be found."}
          action={
            <Button
              variant="outline"
              onClick={() => router.push("/appointments")}
            >
              Back to Appointments
            </Button>
          }
        />
      </div>
    );
  }

  if (!appointment) return null;

  const statusInfo = STATUS_BADGE_MAP[appointment.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/appointments")}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Appointment Details
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-sm text-gray-500">
                {new Date(appointment.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-danger-light text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Info Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Appointment Information
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Date
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(appointment.appointmentDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Time
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {appointment.appointmentTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Doctor
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {appointment.doctor}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Reason
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {appointment.reason || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              {!showNotesInput && (
                <button
                  onClick={() => setShowNotesInput(true)}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  Edit
                </button>
              )}
            </CardHeader>
            <CardBody>
              {showNotesInput ? (
                <div className="space-y-3">
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this appointment..."
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" loading={updating} onClick={saveNotes}>
                      Save Notes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNotesInput(false);
                        setEditNotes(appointment.notes || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <StickyNote className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700">
                    {appointment.notes || "No notes for this appointment."}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Status Actions */}
          {appointment.status === "SCHEDULED" && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Status
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-500 mb-4">
                  Change the appointment status as needed.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={updating}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => updateStatus("COMPLETED")}
                  >
                    Mark Complete
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={updating}
                    icon={<XCircle className="h-4 w-4" />}
                    onClick={() => updateStatus("CANCELLED")}
                  >
                    Cancel Appointment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={updating}
                    icon={<AlertTriangle className="h-4 w-4" />}
                    onClick={() => updateStatus("NO_SHOW")}
                  >
                    No Show
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar - Patient Info */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Patient Information
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {appointment.patient.firstName}{" "}
                    {appointment.patient.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {appointment.patient.patientNumber}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Patient ID
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {appointment.patient.patientNumber}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
