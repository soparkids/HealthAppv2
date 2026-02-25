"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronUp,
  User,
  Heart,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch, ApiError } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

interface PatientFormData {
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

const initialFormData: PatientFormData = {
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
};

export default function NewPatientPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [medicalExpanded, setMedicalExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof PatientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-level error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.dateOfBirth) errors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) errors.gender = "Gender is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email address";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Build payload, omitting empty optional fields
      const payload: Record<string, string> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.address.trim()) payload.address = formData.address.trim();
      if (formData.emergencyContact.trim())
        payload.emergencyContact = formData.emergencyContact.trim();
      if (formData.emergencyPhone.trim())
        payload.emergencyPhone = formData.emergencyPhone.trim();
      if (formData.allergies.trim())
        payload.allergies = formData.allergies.trim();
      if (formData.medicalConditions.trim())
        payload.medicalConditions = formData.medicalConditions.trim();
      if (formData.medications.trim())
        payload.medications = formData.medications.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      const data = await orgApiFetch<{ patient: { id: string } }>(
        "/patients",
        orgId,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      window.location.href = `/patients/${data.patient.id}`;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (orgLoading || !orgId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/patients")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Register New Patient
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fill in the patient details below
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Basic Information
              </h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                error={fieldErrors.firstName}
              />
              <Input
                label="Last Name *"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                error={fieldErrors.lastName}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth *"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                error={fieldErrors.dateOfBirth}
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    fieldErrors.gender
                      ? "border-danger focus:ring-danger/30 focus:border-danger"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {fieldErrors.gender && (
                  <p className="mt-1 text-sm text-danger">
                    {fieldErrors.gender}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="john.doe@email.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                error={fieldErrors.email}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Street address, city, state, zip code"
                rows={2}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </CardBody>
        </Card>

        {/* Medical Information (Expandable) */}
        <Card className="mt-6">
          <button
            type="button"
            onClick={() => setMedicalExpanded(!medicalExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-gray-900">
                Medical Information
              </h2>
              <span className="text-xs text-gray-400 font-normal">
                (Optional)
              </span>
            </div>
            {medicalExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {medicalExpanded && (
            <CardBody className="space-y-4 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Emergency Contact"
                  placeholder="Contact name"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    updateField("emergencyContact", e.target.value)
                  }
                />
                <Input
                  label="Emergency Phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
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
                  placeholder="List known allergies (e.g., Penicillin, Latex, Peanuts)"
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
                  placeholder="List existing medical conditions (e.g., Hypertension, Diabetes Type 2)"
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Medications
                </label>
                <textarea
                  value={formData.medications}
                  onChange={(e) => updateField("medications", e.target.value)}
                  placeholder="List current medications and dosages"
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
                  placeholder="Additional notes or observations"
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </CardBody>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => (window.location.href = "/patients")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            icon={<Save className="h-4 w-4" />}
          >
            Register Patient
          </Button>
        </div>
      </form>
    </div>
  );
}
