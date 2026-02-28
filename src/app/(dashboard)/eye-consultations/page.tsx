"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Stethoscope,
  X,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useRequireProviderRole } from "@/lib/hooks/use-require-role";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
}

interface Consultation {
  id: string;
  consultationDate: string;
  doctor: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  plan: string | null;
  reMovement: string | null;
  leMovement: string | null;
  reLids: string | null;
  leLids: string | null;
  reGlobe: string | null;
  leGlobe: string | null;
  reConjunctiva: string | null;
  leConjunctiva: string | null;
  reCornea: string | null;
  leCornea: string | null;
  reAc: string | null;
  leAc: string | null;
  rePupil: string | null;
  lePupil: string | null;
  reIris: string | null;
  leIris: string | null;
  reLens: string | null;
  leLens: string | null;
  reVrr: string | null;
  leVrr: string | null;
  reVcdr: string | null;
  leVcdr: string | null;
  reOthers: string | null;
  leOthers: string | null;
  patient: Patient;
}

const ITEMS_PER_PAGE = 20;

const EXAM_FIELDS = [
  { label: "Movement", re: "reMovement", le: "leMovement" },
  { label: "Lids", re: "reLids", le: "leLids" },
  { label: "Globe", re: "reGlobe", le: "leGlobe" },
  { label: "Conjunctiva", re: "reConjunctiva", le: "leConjunctiva" },
  { label: "Cornea", re: "reCornea", le: "leCornea" },
  { label: "AC", re: "reAc", le: "leAc" },
  { label: "Pupil", re: "rePupil", le: "lePupil" },
  { label: "Iris", re: "reIris", le: "leIris" },
  { label: "Lens", re: "reLens", le: "leLens" },
  { label: "VRR", re: "reVrr", le: "leVrr" },
  { label: "VCDR", re: "reVcdr", le: "leVcdr" },
  { label: "Others", re: "reOthers", le: "leOthers" },
] as const;

export default function EyeConsultationsPage() {
  const { allowed, loading: roleLoading } = useRequireProviderRole();
  const { orgId, loading: orgLoading } = useOrganization();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  const fetchConsultations = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await orgApiFetch<{
        consultations: Consultation[];
        total: number;
      }>(
        `/eye-consultations?page=${currentPage}&limit=${ITEMS_PER_PAGE}`,
        orgId
      );
      setConsultations(data.consultations);
      setTotalCount(data.total);
    } catch {
      setError("Failed to load consultations. The eye consultation feature may not be enabled.");
    } finally {
      setLoading(false);
    }
  }, [orgId, currentPage]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eye Consultations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} consultation{totalCount !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => (window.location.href = "/eye-consultations/new")}
        >
          New Consultation
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : consultations.length === 0 ? (
        <EmptyState
          icon={<Eye className="h-16 w-16" />}
          title="No consultations yet"
          description="Create your first eye consultation record to get started."
          action={
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => (window.location.href = "/eye-consultations/new")}
            >
              New Consultation
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
                    Patient
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Doctor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Chief Complaint
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diagnosis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {consultations.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedConsultation(c)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(c.consultationDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {c.patient.firstName} {c.patient.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.patient.patientNumber}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 hidden md:table-cell">
                      {c.doctor}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">
                      {c.chiefComplaint || "--"}
                    </td>
                    <td className="px-6 py-4">
                      {c.diagnosis ? (
                        <Badge variant="primary">{c.diagnosis}</Badge>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
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

      {/* Detail Modal */}
      <Modal
        open={!!selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        title="Consultation Details"
        className="max-w-2xl"
      >
        {selectedConsultation && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Summary row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedConsultation.consultationDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Doctor</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedConsultation.doctor}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Patient</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedConsultation.patient.firstName}{" "}
                    {selectedConsultation.patient.lastName}{" "}
                    <span className="text-gray-500 font-normal">
                      ({selectedConsultation.patient.patientNumber})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Chief Complaint */}
            {selectedConsultation.chiefComplaint && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Chief Complaint
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedConsultation.chiefComplaint}
                </p>
              </div>
            )}

            {/* Bilateral Exam */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Bilateral Examination
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Field
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        RE (Right)
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        LE (Left)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {EXAM_FIELDS.map((field) => {
                      const reVal = selectedConsultation[field.re as keyof Consultation] as string | null;
                      const leVal = selectedConsultation[field.le as keyof Consultation] as string | null;
                      if (!reVal && !leVal) return null;
                      return (
                        <tr key={field.label}>
                          <td className="px-3 py-2 font-medium text-gray-700">
                            {field.label}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {reVal || "--"}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {leVal || "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diagnosis & Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Diagnosis
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedConsultation.diagnosis || "Not recorded"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Plan
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedConsultation.plan || "Not recorded"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
