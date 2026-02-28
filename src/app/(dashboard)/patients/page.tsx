"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useRequireProviderRole } from "@/lib/hooks/use-require-role";
import { orgApiFetch } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/use-debounce";
import Card, { CardBody } from "@/components/ui/Card";
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
  createdAt: string;
  updatedAt: string;
}

interface PatientsResponse {
  patients: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 20;

const GENDER_BADGE: Record<string, { label: string; variant: "primary" | "accent" | "default" }> = {
  MALE: { label: "Male", variant: "primary" },
  FEMALE: { label: "Female", variant: "accent" },
  OTHER: { label: "Other", variant: "default" },
};

export default function PatientsPage() {
  const { allowed, loading: roleLoading } = useRequireProviderRole();
  const { orgId, loading: orgLoading } = useOrganization();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchPatients = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      const data = await orgApiFetch<PatientsResponse>(
        `/patients?${params.toString()}`,
        orgId
      );
      setPatients(data.patients);
      setTotalPatients(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [orgId, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

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
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalPatients} patient{totalPatients !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => (window.location.href = "/patients/new")}
        >
          New Patient
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardBody>
          <div className="flex-1 w-full sm:max-w-xs">
            <Input
              placeholder="Search by name, patient #, phone, or email..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : patients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No patients found"
          description={
            searchQuery
              ? "Try adjusting your search criteria."
              : "Get started by registering your first patient."
          }
          action={
            !searchQuery ? (
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => (window.location.href = "/patients/new")}
              >
                New Patient
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Gender
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Date of Birth
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Phone
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() =>
                      (window.location.href = `/patients/${patient.id}`)
                    }
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-primary font-medium">
                        {patient.patientNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Badge
                        variant={
                          GENDER_BADGE[patient.gender]?.variant || "default"
                        }
                      >
                        {GENDER_BADGE[patient.gender]?.label || patient.gender}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {patient.phone || "\u2014"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {patient.email || "\u2014"}
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
            {Math.min(currentPage * ITEMS_PER_PAGE, totalPatients)} of{" "}
            {totalPatients}
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
