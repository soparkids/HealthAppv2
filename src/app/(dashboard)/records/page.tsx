"use client";

import { useState } from "react";
import {
  Search,
  Grid3X3,
  List,
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import Card, { CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useRecords } from "@/lib/hooks/use-records";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { RECORD_TYPE_DISPLAY, RECORD_TYPE_COLORS } from "@/lib/api";

type BadgeVariant = "default" | "primary" | "accent" | "danger" | "warning" | "success";

const recordTypeFilters = [
  { value: "All", label: "All" },
  { value: "XRAY", label: "X-Ray" },
  { value: "MRI", label: "MRI" },
  { value: "CT_SCAN", label: "CT Scan" },
  { value: "ULTRASOUND", label: "Ultrasound" },
  { value: "OTHER", label: "Other" },
];

const ITEMS_PER_PAGE = 6;

export default function RecordsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, loading } = useRecords({
    search: debouncedSearch || undefined,
    type: typeFilter,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const records = data?.records || [];
  const totalRecords = data?.pagination.total || 0;
  const totalPages = data?.pagination.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalRecords} record{totalRecords !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          icon={<Upload className="h-4 w-4" />}
          onClick={() => (window.location.href = "/records/upload")}
        >
          Upload New
        </Button>
      </div>

      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full sm:max-w-xs">
            <Input
              placeholder="Search records..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {recordTypeFilters.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          title="No records found"
          description="Try adjusting your search or filter criteria, or upload your first record."
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <a key={record.id} href={`/records/${record.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="h-40 bg-gray-100 rounded-t-xl flex items-center justify-center">
                  <FileText className="h-12 w-12 text-gray-300" />
                </div>
                <CardBody>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        (RECORD_TYPE_COLORS[record.type] as BadgeVariant) || "default"
                      }
                    >
                      {RECORD_TYPE_DISPLAY[record.type] || record.type}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(record.recordDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    {record.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {record.facility || "Unknown facility"}
                  </p>
                </CardBody>
              </Card>
            </a>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Record
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Facility
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() =>
                      (window.location.href = `/records/${record.id}`)
                    }
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.bodyPart || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          (RECORD_TYPE_COLORS[record.type] as BadgeVariant) ||
                          "default"
                        }
                      >
                        {RECORD_TYPE_DISPLAY[record.type] || record.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {record.facility || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(record.recordDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)} of{" "}
            {totalRecords}
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
