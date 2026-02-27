"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

interface AlertEquipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  location: string | null;
  status: string;
}

interface Alert {
  id: string;
  equipmentId: string;
  riskScore: number;
  predictedFailureDate: string | null;
  recommendedAction: string;
  urgency: string;
  status: string;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: string;
  equipment: AlertEquipment;
}

interface AlertsResponse {
  alerts: Alert[];
  summary: {
    active: number;
    critical: number;
    high: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 20;

const URGENCY_BADGE: Record<string, { label: string; variant: "success" | "default" | "warning" | "danger" }> = {
  LOW: { label: "Low", variant: "success" },
  MEDIUM: { label: "Medium", variant: "default" },
  HIGH: { label: "High", variant: "warning" },
  CRITICAL: { label: "Critical", variant: "danger" },
};

const ALERT_STATUS_BADGE: Record<string, { label: string; variant: "danger" | "warning" | "success" | "default" }> = {
  ACTIVE: { label: "Active", variant: "danger" },
  ACKNOWLEDGED: { label: "Acknowledged", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
  DISMISSED: { label: "Dismissed", variant: "default" },
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

export default function AlertsDashboardPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<{ active: number; critical: number; high: number }>({
    active: 0,
    critical: 0,
    high: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAlerts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (urgencyFilter) params.set("urgency", urgencyFilter);

      const data = await orgApiFetch<AlertsResponse>(
        `/equipment/alerts?${params.toString()}`,
        orgId
      );
      setAlerts(data.alerts);
      setSummary(data.summary);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [orgId, currentPage, statusFilter, urgencyFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, urgencyFilter]);

  const handleAlertAction = async (equipmentId: string, alertId: string, status: string) => {
    if (!orgId) return;
    try {
      await orgApiFetch(`/equipment/${equipmentId}/alerts`, orgId, {
        method: "PUT",
        body: JSON.stringify({ alertId, status }),
      });
      await fetchAlerts();
    } catch {
      // silently handle
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/equipment")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered predictive maintenance alerts across all equipment
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-danger">{summary.critical}</p>
            <p className="text-sm text-gray-500">Critical Alerts</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-warning">{summary.high}</p>
            <p className="text-sm text-gray-500">High Priority</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-primary">{summary.active}</p>
            <p className="text-sm text-gray-500">Active Alerts</p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">All Statuses</option>
              {Object.entries(ALERT_STATUS_BADGE).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">All Urgencies</option>
              {Object.entries(URGENCY_BADGE).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Alerts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-16 w-16" />}
          title="No alerts found"
          description={
            statusFilter || urgencyFilter
              ? "Try adjusting your filters."
              : "No prediction alerts yet. Run AI predictions on your equipment to generate alerts."
          }
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={URGENCY_BADGE[alert.urgency]?.variant || "default"}>
                        {URGENCY_BADGE[alert.urgency]?.label || alert.urgency}
                      </Badge>
                      <Badge variant={ALERT_STATUS_BADGE[alert.status]?.variant || "default"}>
                        {ALERT_STATUS_BADGE[alert.status]?.label || alert.status}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Risk: {(alert.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="cursor-pointer"
                      onClick={() => (window.location.href = `/equipment/${alert.equipmentId}`)}
                    >
                      <p className="text-sm font-medium text-primary hover:underline">
                        {alert.equipment.name} ({TYPE_LABELS[alert.equipment.type] || alert.equipment.type})
                      </p>
                      <p className="text-xs text-gray-500">
                        S/N: {alert.equipment.serialNumber}
                        {alert.equipment.location && ` | ${alert.equipment.location}`}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700">{alert.recommendedAction}</p>
                    {alert.predictedFailureDate && (
                      <p className="text-xs text-danger">
                        Predicted failure: {new Date(alert.predictedFailureDate).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Created: {new Date(alert.createdAt).toLocaleDateString()}
                      {alert.aiProvider && ` | AI: ${alert.aiProvider}/${alert.aiModel}`}
                    </p>
                  </div>
                  {alert.status === "ACTIVE" && (
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.equipmentId, alert.id, "ACKNOWLEDGED")}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.equipmentId, alert.id, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
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
