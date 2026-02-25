"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Eye,
  Save,
  Search,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
}

interface ExamFormData {
  patientId: string;
  consultationDate: string;
  doctor: string;
  chiefComplaint: string;
  reMovement: string;
  leMovement: string;
  reLids: string;
  leLids: string;
  reGlobe: string;
  leGlobe: string;
  reConjunctiva: string;
  leConjunctiva: string;
  reCornea: string;
  leCornea: string;
  reAc: string;
  leAc: string;
  rePupil: string;
  lePupil: string;
  reIris: string;
  leIris: string;
  reLens: string;
  leLens: string;
  reVrr: string;
  leVrr: string;
  reVcdr: string;
  leVcdr: string;
  reOthers: string;
  leOthers: string;
  diagnosis: string;
  plan: string;
}

const BILATERAL_FIELDS: { label: string; reKey: keyof ExamFormData; leKey: keyof ExamFormData }[] = [
  { label: "Movement", reKey: "reMovement", leKey: "leMovement" },
  { label: "Lids", reKey: "reLids", leKey: "leLids" },
  { label: "Globe", reKey: "reGlobe", leKey: "leGlobe" },
  { label: "Conjunctiva", reKey: "reConjunctiva", leKey: "leConjunctiva" },
  { label: "Cornea", reKey: "reCornea", leKey: "leCornea" },
  { label: "AC", reKey: "reAc", leKey: "leAc" },
  { label: "Pupil", reKey: "rePupil", leKey: "lePupil" },
  { label: "Iris", reKey: "reIris", leKey: "leIris" },
  { label: "Lens", reKey: "reLens", leKey: "leLens" },
  { label: "VRR", reKey: "reVrr", leKey: "leVrr" },
  { label: "VCDR", reKey: "reVcdr", leKey: "leVcdr" },
  { label: "Others", reKey: "reOthers", leKey: "leOthers" },
];

const INITIAL_FORM: ExamFormData = {
  patientId: "",
  consultationDate: new Date().toISOString().split("T")[0],
  doctor: "",
  chiefComplaint: "",
  reMovement: "",
  leMovement: "",
  reLids: "",
  leLids: "",
  reGlobe: "",
  leGlobe: "",
  reConjunctiva: "",
  leConjunctiva: "",
  reCornea: "",
  leCornea: "",
  reAc: "",
  leAc: "",
  rePupil: "",
  lePupil: "",
  reIris: "",
  leIris: "",
  reLens: "",
  leLens: "",
  reVrr: "",
  leVrr: "",
  reVcdr: "",
  leVcdr: "",
  reOthers: "",
  leOthers: "",
  diagnosis: "",
  plan: "",
};

export default function NewEyeConsultationPage() {
  const { orgId, loading: orgLoading } = useOrganization();

  const [form, setForm] = useState<ExamFormData>(INITIAL_FORM);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!orgId) return;
    setPatientsLoading(true);
    try {
      const data = await orgApiFetch<{ patients: Patient[] }>(
        "/patients?limit=100",
        orgId
      );
      setPatients(data.patients);
    } catch {
      // Silently handle - patients dropdown just won't populate
    } finally {
      setPatientsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.patientNumber.toLowerCase().includes(q)
    );
  });

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setForm({ ...form, patientId: patient.id });
    setPatientSearch(`${patient.firstName} ${patient.lastName} (${patient.patientNumber})`);
    setShowPatientDropdown(false);
  };

  const updateField = (key: keyof ExamFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!orgId || !form.patientId || !form.doctor) return;
    setSubmitting(true);
    setError(null);

    // Build body, omitting empty optional fields
    const body: Record<string, string> = {
      patientId: form.patientId,
      consultationDate: form.consultationDate,
      doctor: form.doctor,
    };

    const optionalFields: (keyof ExamFormData)[] = [
      "chiefComplaint",
      "reMovement", "leMovement",
      "reLids", "leLids",
      "reGlobe", "leGlobe",
      "reConjunctiva", "leConjunctiva",
      "reCornea", "leCornea",
      "reAc", "leAc",
      "rePupil", "lePupil",
      "reIris", "leIris",
      "reLens", "leLens",
      "reVrr", "leVrr",
      "reVcdr", "leVcdr",
      "reOthers", "leOthers",
      "diagnosis", "plan",
    ];

    for (const key of optionalFields) {
      if (form[key]) {
        body[key] = form[key];
      }
    }

    try {
      await orgApiFetch("/eye-consultations", orgId, {
        method: "POST",
        body: JSON.stringify(body),
      });
      window.location.href = "/eye-consultations";
    } catch {
      setError("Failed to create consultation. Please check your permissions and try again.");
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

  const canSubmit = form.patientId && form.doctor && form.consultationDate;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/eye-consultations")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            New Eye Consultation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Record a new eye examination
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Patient & Basic Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Patient & Visit Information
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Patient selector */}
          <div className="relative">
            <Input
              label="Patient"
              placeholder="Search by name or patient number..."
              icon={<Search className="h-4 w-4" />}
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                setShowPatientDropdown(true);
                if (selectedPatient) {
                  setSelectedPatient(null);
                  setForm({ ...form, patientId: "" });
                }
              }}
              onFocus={() => setShowPatientDropdown(true)}
            />
            {showPatientDropdown && patientSearch && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patientsLoading ? (
                  <div className="flex justify-center py-3">
                    <Spinner size="sm" />
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <p className="text-sm text-gray-500 px-3 py-3">
                    No patients found.
                  </p>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <span className="font-medium text-gray-900">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({p.patientNumber})
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Consultation Date"
              type="date"
              value={form.consultationDate}
              onChange={(e) => updateField("consultationDate", e.target.value)}
            />
            <Input
              label="Doctor"
              placeholder="Dr. name"
              value={form.doctor}
              onChange={(e) => updateField("doctor", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chief Complaint
            </label>
            <textarea
              value={form.chiefComplaint}
              onChange={(e) => updateField("chiefComplaint", e.target.value)}
              placeholder="Describe the chief complaint..."
              rows={2}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </CardBody>
      </Card>

      {/* Bilateral Examination */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Bilateral Examination
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter findings for Right Eye (RE) and Left Eye (LE)
          </p>
        </CardHeader>
        <CardBody>
          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 mb-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Field
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
              RE (Right Eye)
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
              LE (Left Eye)
            </div>
          </div>

          <div className="space-y-3">
            {BILATERAL_FIELDS.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-center"
              >
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder="RE"
                  value={form[field.reKey]}
                  onChange={(e) => updateField(field.reKey, e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="LE"
                  value={form[field.leKey]}
                  onChange={(e) => updateField(field.leKey, e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Diagnosis & Plan */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Diagnosis & Plan
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <textarea
              value={form.diagnosis}
              onChange={(e) => updateField("diagnosis", e.target.value)}
              placeholder="Enter diagnosis..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan
            </label>
            <textarea
              value={form.plan}
              onChange={(e) => updateField("plan", e.target.value)}
              placeholder="Enter treatment plan..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/eye-consultations")}
        >
          Cancel
        </Button>
        <Button
          icon={<Save className="h-4 w-4" />}
          loading={submitting}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Save Consultation
        </Button>
      </div>
    </div>
  );
}
