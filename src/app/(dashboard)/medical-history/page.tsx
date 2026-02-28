"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ClipboardList,
  Plus,
  Clock,
  Pill,
  Heart,
  FileText,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useRequireProviderRole } from "@/lib/hooks/use-require-role";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
}

interface CurrentPatient {
  medicalConditions: string | null;
  medications: string | null;
  notes: string | null;
}

interface HistoryEntry {
  id: string;
  medicalConditions: string | null;
  medications: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MedicalHistoryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}>
      <MedicalHistoryContent />
    </Suspense>
  );
}

function MedicalHistoryContent() {
  const { allowed, loading: roleLoading } = useRequireProviderRole();
  const { orgId, loading: orgLoading } = useOrganization();
  const searchParams = useSearchParams();
  const urlPatientId = searchParams.get("patientId");

  // Patient selection state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(urlPatientId || "");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // History state
  const [currentPatient, setCurrentPatient] = useState<CurrentPatient | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConditions, setNewConditions] = useState("");
  const [newMedications, setNewMedications] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);

  // Expanded entries
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const fetchPatients = useCallback(async () => {
    if (!orgId) return;
    setPatientsLoading(true);
    try {
      const data = await orgApiFetch<{ patients: Patient[] }>(
        "/patients?limit=100",
        orgId
      );
      setPatients(data.patients);
      // If we have a URL patient ID, find and select it
      if (urlPatientId) {
        const match = data.patients.find((p) => p.id === urlPatientId);
        if (match) {
          setSelectedPatient(match);
          setPatientSearch(`${match.firstName} ${match.lastName} (${match.patientNumber})`);
        }
      }
    } catch {
      // Silently handle
    } finally {
      setPatientsLoading(false);
    }
  }, [orgId, urlPatientId]);

  const fetchHistory = useCallback(async () => {
    if (!orgId || !selectedPatientId) return;
    setHistoryLoading(true);
    setError(null);
    try {
      const data = await orgApiFetch<{
        entries: HistoryEntry[];
        currentPatient: CurrentPatient;
      }>(`/medical-history?patientId=${selectedPatientId}`, orgId);
      setEntries(data.entries);
      setCurrentPatient(data.currentPatient);
    } catch {
      setError("Failed to load medical history. The medical history feature may not be enabled.");
    } finally {
      setHistoryLoading(false);
    }
  }, [orgId, selectedPatientId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchHistory();
    }
  }, [selectedPatientId, fetchHistory]);

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
    setSelectedPatientId(patient.id);
    setPatientSearch(`${patient.firstName} ${patient.lastName} (${patient.patientNumber})`);
    setShowPatientDropdown(false);
  };

  const handleAddEntry = async () => {
    if (!orgId || !selectedPatientId) return;
    if (!newConditions && !newMedications && !newNotes) return;
    setAddingEntry(true);
    setError(null);

    const body: Record<string, string> = { patientId: selectedPatientId };
    if (newConditions) body.medicalConditions = newConditions;
    if (newMedications) body.medications = newMedications;
    if (newNotes) body.notes = newNotes;

    try {
      await orgApiFetch("/medical-history", orgId, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewConditions("");
      setNewMedications("");
      setNewNotes("");
      setShowAddForm(false);
      fetchHistory();
    } catch {
      setError("Failed to add history entry. Check your permissions and try again.");
    } finally {
      setAddingEntry(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (roleLoading || !allowed || orgLoading || !orgId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage patient medical history records.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
          <button
            className="ml-2 underline text-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Patient Selector */}
      <Card>
        <CardBody>
          <div className="relative">
            <Input
              label="Select Patient"
              placeholder="Search by name or patient number..."
              icon={<Search className="h-4 w-4" />}
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                setShowPatientDropdown(true);
                if (selectedPatient) {
                  setSelectedPatient(null);
                  setSelectedPatientId("");
                  setEntries([]);
                  setCurrentPatient(null);
                }
              }}
              onFocus={() => setShowPatientDropdown(true)}
            />
            {showPatientDropdown && patientSearch && !selectedPatient && (
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
        </CardBody>
      </Card>

      {/* No patient selected */}
      {!selectedPatientId && (
        <EmptyState
          icon={<ClipboardList className="h-16 w-16" />}
          title="Select a Patient"
          description="Search and select a patient above to view their medical history."
        />
      )}

      {/* Loading History */}
      {selectedPatientId && historyLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Patient History Content */}
      {selectedPatientId && !historyLoading && (
        <>
          {/* Current Patient Info Card */}
          {currentPatient && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Current Patient Summary
                    </h2>
                    {selectedPatient && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {selectedPatient.firstName} {selectedPatient.lastName} --{" "}
                        {selectedPatient.patientNumber}
                      </p>
                    )}
                  </div>
                  <Badge variant="primary">Active</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-danger" />
                      <h3 className="text-sm font-medium text-gray-700">
                        Medical Conditions
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {currentPatient.medicalConditions || "None recorded"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-accent" />
                      <h3 className="text-sm font-medium text-gray-700">
                        Medications
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {currentPatient.medications || "None recorded"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium text-gray-700">
                        Notes
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {currentPatient.notes || "No notes"}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Add Entry Button / Form */}
          {!showAddForm ? (
            <div className="flex justify-end">
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowAddForm(true)}
              >
                Add Entry
              </Button>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  New History Entry
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Conditions
                  </label>
                  <textarea
                    value={newConditions}
                    onChange={(e) => setNewConditions(e.target.value)}
                    placeholder="List medical conditions..."
                    rows={2}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medications
                  </label>
                  <textarea
                    value={newMedications}
                    onChange={(e) => setNewMedications(e.target.value)}
                    placeholder="List current medications..."
                    rows={2}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </CardBody>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewConditions("");
                    setNewMedications("");
                    setNewNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  icon={<Save className="h-4 w-4" />}
                  loading={addingEntry}
                  disabled={!newConditions && !newMedications && !newNotes}
                  onClick={handleAddEntry}
                >
                  Save Entry
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                History Timeline
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {entries.length} entr{entries.length !== 1 ? "ies" : "y"} recorded
              </p>
            </CardHeader>
            <CardBody>
              {entries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No history entries yet. Add one to get started.
                </p>
              ) : (
                <div className="space-y-0">
                  {entries.map((entry, i) => {
                    const isExpanded = expandedEntries.has(entry.id);
                    return (
                      <div key={entry.id} className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className="h-3 w-3 rounded-full bg-primary mt-1.5 shrink-0" />
                          {i < entries.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200" />
                          )}
                        </div>

                        {/* Entry content */}
                        <div className="flex-1 pb-6">
                          <button
                            className="w-full text-left"
                            onClick={() => toggleExpanded(entry.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {new Date(entry.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>

                            {/* Summary line (always visible) */}
                            {!isExpanded && (
                              <p className="text-sm text-gray-500 mt-1 truncate">
                                {[
                                  entry.medicalConditions && `Conditions: ${entry.medicalConditions}`,
                                  entry.medications && `Meds: ${entry.medications}`,
                                  entry.notes,
                                ]
                                  .filter(Boolean)
                                  .join(" | ") || "No details recorded"}
                              </p>
                            )}
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-4">
                              {entry.medicalConditions && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Heart className="h-3.5 w-3.5 text-danger" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Medical Conditions
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {entry.medicalConditions}
                                  </p>
                                </div>
                              )}
                              {entry.medications && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Pill className="h-3.5 w-3.5 text-accent" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Medications
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {entry.medications}
                                  </p>
                                </div>
                              )}
                              {entry.notes && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Notes
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {entry.notes}
                                  </p>
                                </div>
                              )}
                              {!entry.medicalConditions && !entry.medications && !entry.notes && (
                                <p className="text-sm text-gray-500">
                                  No details recorded for this entry.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
