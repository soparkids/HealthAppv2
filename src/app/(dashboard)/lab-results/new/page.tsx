"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Calendar,
  User,
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

interface PatientsResponse {
  patients: Patient[];
}

export default function NewLabResultPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [testName, setTestName] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [datePerformed, setDatePerformed] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchPatients = useCallback(async () => {
    if (!orgId) return;
    setPatientsLoading(true);
    try {
      const data = await orgApiFetch<PatientsResponse>(
        "/patients?limit=100",
        orgId
      );
      setPatients(data.patients);
    } catch {
      // silently handle
    } finally {
      setPatientsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = patientSearch
    ? patients.filter((p) => {
        const q = patientSearch.toLowerCase();
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return (
          fullName.includes(q) ||
          p.patientNumber.toLowerCase().includes(q)
        );
      })
    : patients;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedPatient) {
      setError("Please select a patient.");
      return;
    }
    if (!testName || !resultValue || !datePerformed) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!orgId) return;

    setSubmitting(true);
    try {
      await orgApiFetch("/lab-results", orgId, {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient.id,
          testName,
          resultValue,
          unit: unit || undefined,
          referenceRange: referenceRange || undefined,
          datePerformed,
          notes: notes || undefined,
        }),
      });
      router.push("/lab-results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lab result.");
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/lab-results")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Lab Result</h1>
          <p className="text-sm text-gray-500 mt-1">
            Record a new lab result for a patient
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Lab Result Details
          </h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Patient Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient <span className="text-danger">*</span>
              </label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-300 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedPatient.patientNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearch("");
                    }}
                    className="text-sm text-primary hover:text-primary-hover font-medium"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search patients by name or number..."
                    icon={<Search className="h-4 w-4" />}
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                  />
                  {showPatientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {patientsLoading ? (
                        <div className="flex justify-center py-4">
                          <Spinner size="sm" />
                        </div>
                      ) : filteredPatients.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No patients found.
                        </div>
                      ) : (
                        filteredPatients.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setShowPatientDropdown(false);
                              setPatientSearch("");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.patientNumber}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Name */}
            <Input
              label="Test Name"
              placeholder="e.g., Complete Blood Count, Lipid Panel"
              icon={<FlaskConical className="h-4 w-4" />}
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              required
            />

            {/* Result Value & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Result Value"
                placeholder="e.g., 120"
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                required
              />
              <Input
                label="Unit"
                placeholder="e.g., mg/dL"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            {/* Reference Range */}
            <Input
              label="Reference Range"
              placeholder="e.g., 70-100 mg/dL"
              value={referenceRange}
              onChange={(e) => setReferenceRange(e.target.value)}
            />

            {/* Date Performed */}
            <Input
              label="Date Performed"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              value={datePerformed}
              onChange={(e) => setDatePerformed(e.target.value)}
              required
            />

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                placeholder="Additional notes about this lab result..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-danger-light text-danger text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={submitting}>
                <FlaskConical className="h-4 w-4" />
                Save Lab Result
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/lab-results")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
