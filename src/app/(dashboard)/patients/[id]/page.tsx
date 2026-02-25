"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  AlertTriangle,
  Pill,
  StickyNote,
  ShieldAlert,
  CalendarCheck,
  FlaskConical,
  ClipboardList,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch, ApiError } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

interface Patient {
  id: string;
  organizationId: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  notes: string | null;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
  appointments?: Array<{ id: string; appointmentDate: string; status: string; reason: string | null }>;
  labResults?: Array<{ id: string; testName: string; datePerformed: string; status: string }>;
  medicalHistories?: Array<{ id: string; createdAt: string }>;
  eyeConsultations?: Array<{ id: string; consultationDate: string }>;
}

interface EditFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  notes: string;
}

const GENDER_BADGE: Record<string, { label: string; variant: "primary" | "accent" | "default" }> = {
  MALE: { label: "Male", variant: "primary" },
  FEMALE: { label: "Female", variant: "accent" },
  OTHER: { label: "Other", variant: "default" },
};

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;
  const { orgId, loading: orgLoading } = useOrganization();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    allergies: "",
    medicalConditions: "",
    medications: "",
    notes: "",
  });

  const fetchPatient = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await orgApiFetch<{ patient: Patient }>(
        `/patients/${patientId}`,
        orgId
      );
      setPatient(data.patient);
      populateForm(data.patient);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load patient details.");
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const populateForm = (p: Patient) => {
    setFormData({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
      gender: p.gender,
      phone: p.phone || "",
      email: p.email || "",
      address: p.address || "",
      emergencyContact: p.emergencyContact || "",
      emergencyPhone: p.emergencyPhone || "",
      allergies: p.allergies || "",
      medicalConditions: p.medicalConditions || "",
      medications: p.medications || "",
      notes: p.notes || "",
    });
  };

  const updateField = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (patient) populateForm(patient);
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!orgId || !patient) return;
    setSaving(true);
    setSaveError(null);

    try {
      const payload: Record<string, string> = {};
      // Only send changed fields
      if (formData.firstName !== patient.firstName)
        payload.firstName = formData.firstName;
      if (formData.lastName !== patient.lastName)
        payload.lastName = formData.lastName;
      if (formData.dateOfBirth !== (patient.dateOfBirth?.split("T")[0] || ""))
        payload.dateOfBirth = formData.dateOfBirth;
      if (formData.gender !== patient.gender) payload.gender = formData.gender;
      if (formData.phone !== (patient.phone || ""))
        payload.phone = formData.phone;
      if (formData.email !== (patient.email || ""))
        payload.email = formData.email;
      if (formData.address !== (patient.address || ""))
        payload.address = formData.address;
      if (formData.emergencyContact !== (patient.emergencyContact || ""))
        payload.emergencyContact = formData.emergencyContact;
      if (formData.emergencyPhone !== (patient.emergencyPhone || ""))
        payload.emergencyPhone = formData.emergencyPhone;
      if (formData.allergies !== (patient.allergies || ""))
        payload.allergies = formData.allergies;
      if (formData.medicalConditions !== (patient.medicalConditions || ""))
        payload.medicalConditions = formData.medicalConditions;
      if (formData.medications !== (patient.medications || ""))
        payload.medications = formData.medications;
      if (formData.notes !== (patient.notes || ""))
        payload.notes = formData.notes;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const data = await orgApiFetch<{ patient: Patient }>(
        `/patients/${patientId}`,
        orgId,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      setPatient(data.patient);
      populateForm(data.patient);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save changes. Please try again.");
      }
    } finally {
      setSaving(false);
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

  if (error || !patient) {
    return (
      <div className="py-12">
        <EmptyState
          title="Patient not found"
          description={error || "The requested patient could not be found."}
          action={
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/patients")}
            >
              Back to Patients
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.location.href = "/patients")}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <Badge variant={GENDER_BADGE[patient.gender]?.variant || "default"}>
                {GENDER_BADGE[patient.gender]?.label || patient.gender}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">
              {patient.patientNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                loading={saving}
                onClick={handleSave}
                icon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              icon={<Edit3 className="h-4 w-4" />}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
          <p className="text-sm text-danger font-medium">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                    />
                    <Input
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Date of Birth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        updateField("dateOfBirth", e.target.value)
                      }
                    />
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => updateField("gender", e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      rows={2}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InfoRow
                    icon={<Calendar className="h-5 w-5" />}
                    label="Date of Birth"
                    value={new Date(patient.dateOfBirth).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  />
                  <InfoRow
                    icon={<Phone className="h-5 w-5" />}
                    label="Phone"
                    value={patient.phone}
                  />
                  <InfoRow
                    icon={<Mail className="h-5 w-5" />}
                    label="Email"
                    value={patient.email}
                  />
                  <InfoRow
                    icon={<MapPin className="h-5 w-5" />}
                    label="Address"
                    value={patient.address}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Medical Information
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Emergency Contact"
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        updateField("emergencyContact", e.target.value)
                      }
                    />
                    <Input
                      label="Emergency Phone"
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) =>
                        updateField("emergencyPhone", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allergies
                    </label>
                    <textarea
                      value={formData.allergies}
                      onChange={(e) => updateField("allergies", e.target.value)}
                      rows={2}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Conditions
                    </label>
                    <textarea
                      value={formData.medicalConditions}
                      onChange={(e) =>
                        updateField("medicalConditions", e.target.value)
                      }
                      rows={3}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medications
                    </label>
                    <textarea
                      value={formData.medications}
                      onChange={(e) =>
                        updateField("medications", e.target.value)
                      }
                      rows={3}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={3}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InfoRow
                      icon={<ShieldAlert className="h-5 w-5" />}
                      label="Emergency Contact"
                      value={patient.emergencyContact}
                    />
                    <InfoRow
                      icon={<Phone className="h-5 w-5" />}
                      label="Emergency Phone"
                      value={patient.emergencyPhone}
                    />
                  </div>
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <MedicalField
                      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
                      label="Allergies"
                      value={patient.allergies}
                      emptyText="No known allergies"
                    />
                    <MedicalField
                      icon={<Heart className="h-4 w-4 text-danger" />}
                      label="Medical Conditions"
                      value={patient.medicalConditions}
                      emptyText="No conditions recorded"
                    />
                    <MedicalField
                      icon={<Pill className="h-4 w-4 text-primary" />}
                      label="Medications"
                      value={patient.medications}
                      emptyText="No medications recorded"
                    />
                    <MedicalField
                      icon={<StickyNote className="h-4 w-4 text-gray-400" />}
                      label="Notes"
                      value={patient.notes}
                      emptyText="No notes"
                    />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - Quick Links & Meta */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Links
              </h2>
            </CardHeader>
            <CardBody className="space-y-2">
              <QuickLink
                icon={<CalendarCheck className="h-5 w-5" />}
                label="View Appointments"
                href={`/appointments?patientId=${patient.id}`}
                count={patient.appointments?.length}
              />
              <QuickLink
                icon={<FlaskConical className="h-5 w-5" />}
                label="View Lab Results"
                href={`/lab-results?patientId=${patient.id}`}
                count={patient.labResults?.length}
              />
              <QuickLink
                icon={<ClipboardList className="h-5 w-5" />}
                label="View Medical History"
                href={`/medical-history?patientId=${patient.id}`}
                count={patient.medicalHistories?.length}
              />
            </CardBody>
          </Card>

          {/* Record Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Record Info
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Patient Number
                </p>
                <p className="text-sm font-mono font-medium text-gray-900">
                  {patient.patientNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Registered
                </p>
                <p className="text-sm text-gray-700">
                  {new Date(patient.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Last Updated
                </p>
                <p className="text-sm text-gray-700">
                  {new Date(patient.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {patient.linkedUserId && (
                <div>
                  <Badge variant="success">Linked to User Account</Badge>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900">
          {value || "Not specified"}
        </p>
      </div>
    </div>
  );
}

function MedicalField({
  icon,
  label,
  value,
  emptyText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  emptyText: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`text-sm leading-relaxed ${
          value ? "text-gray-700" : "text-gray-400 italic"
        }`}
      >
        {value || emptyText}
      </p>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  href,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  count?: number;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="text-gray-400 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <Badge variant="default">{count}</Badge>
      )}
    </a>
  );
}
