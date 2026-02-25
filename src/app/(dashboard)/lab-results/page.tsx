"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Brain,
  Calendar,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

type BadgeVariant = "default" | "primary" | "accent" | "danger" | "warning" | "success";

interface LabResult {
  id: string;
  organizationId: string;
  patientId: string;
  testName: string;
  resultValue: string;
  unit: string | null;
  referenceRange: string | null;
  datePerformed: string;
  notes: string | null;
  interpretationStatus: string | null;
  interpretationText: string | null;
  riskLevel: string | null;
  confidence: number | null;
  recommendations: string[] | null;
  interpretedAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
}

interface LabResultsResponse {
  results: LabResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const RISK_LEVEL_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  NORMAL: { label: "Normal", variant: "success" },
  LOW: { label: "Low", variant: "primary" },
  MODERATE: { label: "Moderate", variant: "warning" },
  HIGH: { label: "High", variant: "danger" },
  CRITICAL: { label: "Critical", variant: "danger" },
};

const ITEMS_PER_PAGE = 20;

export default function LabResultsPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const router = useRouter();

  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchResults = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      const data = await orgApiFetch<LabResultsResponse>(
        `/lab-results?${params.toString()}`,
        orgId
      );
      setResults(data.results);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [orgId, currentPage]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (orgLoading || !orgId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredResults = searchQuery
    ? results.filter((r) => {
        const q = searchQuery.toLowerCase();
        const patientName = `${r.patient.firstName} ${r.patient.lastName}`.toLowerCase();
        return (
          r.testName.toLowerCase().includes(q) ||
          patientName.includes(q) ||
          (r.resultValue && r.resultValue.toLowerCase().includes(q))
        );
      })
    : results;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FlaskConical className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
          </div>
          <p className="text-sm text-gray-500">
            {total} result{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => router.push("/lab-results/new")}
        >
          New Lab Result
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full sm:max-w-xs">
            <Input
              placeholder="Search by test name, patient..."
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
      ) : filteredResults.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-16 w-16" />}
          title="No lab results found"
          description="Try adjusting your search or add a new lab result."
          action={
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/lab-results/new")}
            >
              New Lab Result
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
                    Test Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Patient
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    AI Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredResults.map((result) => {
                  const riskInfo = result.riskLevel
                    ? RISK_LEVEL_BADGE_MAP[result.riskLevel]
                    : null;
                  return (
                    <tr
                      key={result.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/lab-results/${result.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-900">
                            {new Date(result.datePerformed).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {result.testName}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {result.resultValue}
                          {result.unit && (
                            <span className="text-gray-500 ml-1">
                              {result.unit}
                            </span>
                          )}
                        </p>
                        {result.referenceRange && (
                          <p className="text-xs text-gray-400">
                            Ref: {result.referenceRange}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {result.patient.firstName} {result.patient.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.patient.patientNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {riskInfo ? (
                          <Badge variant={riskInfo.variant}>
                            {riskInfo.label}
                          </Badge>
                        ) : (
                          <Badge variant="default">Pending</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {result.interpretedAt ? (
                          <div className="flex items-center gap-1.5">
                            <Brain className="h-4 w-4 text-success" />
                            <span className="text-sm text-success font-medium">
                              Interpreted
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Brain className="h-4 w-4 text-gray-300" />
                            <span className="text-sm text-gray-400">
                              Not interpreted
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
