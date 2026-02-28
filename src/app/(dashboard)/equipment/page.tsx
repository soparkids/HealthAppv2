"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Upload,
  AlertTriangle,
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

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  installDate: string | null;
  warrantyExpiry: string | null;
  createdAt: string;
}

interface EquipmentResponse {
  equipment: Equipment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 20;

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "default" | "warning" | "danger" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "default" },
  UNDER_MAINTENANCE: { label: "Maintenance", variant: "warning" },
  DECOMMISSIONED: { label: "Decommissioned", variant: "danger" },
};

const TYPE_LABELS: Record<string, string> = {
  MRI: "MRI",
  XRAY: "X-Ray",
  CT_SCANNER: "CT Scanner",
  ULTRASOUND: "Ultrasound",
  VENTILATOR: "Ventilator",
  PATIENT_MONITOR: "Patient Monitor",
  INFUSION_PUMP: "Infusion Pump",
  DEFIBRILLATOR: "Defibrillator",
  OTHER: "Other",
};

export default function EquipmentPage() {
  const { allowed, loading: roleLoading } = useRequireProviderRole();
  const { orgId, loading: orgLoading } = useOrganization();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchEquipment = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const data = await orgApiFetch<EquipmentResponse>(
        `/equipment?${params.toString()}`,
        orgId
      );
      setEquipment(data.equipment);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [orgId, currentPage, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

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
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalItems} piece{totalItems !== 1 ? "s" : ""} of equipment registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<AlertTriangle className="h-4 w-4" />}
            onClick={() => (window.location.href = "/equipment/alerts")}
          >
            Alerts
          </Button>
          <Button
            variant="outline"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => (window.location.href = "/equipment/import")}
          >
            Import CSV
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => (window.location.href = "/equipment/new")}
          >
            New Equipment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 sm:max-w-xs">
              <Input
                placeholder="Search by name, serial #, manufacturer..."
                icon={<Search className="h-4 w-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_BADGE).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : equipment.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-16 w-16" />}
          title="No equipment found"
          description={
            searchQuery || typeFilter || statusFilter
              ? "Try adjusting your search or filter criteria."
              : "Get started by registering your first piece of equipment."
          }
          action={
            !(searchQuery || typeFilter || statusFilter) ? (
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => (window.location.href = "/equipment/new")}
              >
                New Equipment
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
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Serial #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Location
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {equipment.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => (window.location.href = `/equipment/${item.id}`)}
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 sm:hidden">
                        {TYPE_LABELS[item.type] || item.type}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {TYPE_LABELS[item.type] || item.type}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-mono text-primary font-medium">
                        {item.serialNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {item.location || "\u2014"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={STATUS_BADGE[item.status]?.variant || "default"}
                      >
                        {STATUS_BADGE[item.status]?.label || item.status}
                      </Badge>
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
            {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
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
