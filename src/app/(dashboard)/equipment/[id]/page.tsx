"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Wrench,
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  MapPin,
  Shield,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch, ApiError } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

interface EquipmentDetail {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  manufacturer: string | null;
  model: string | null;
  installDate: string | null;
  warrantyExpiry: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  maintenanceLogs: MaintenanceLog[];
  sensorReadings: SensorReading[];
  predictionAlerts: PredictionAlert[];
}

interface MaintenanceLog {
  id: string;
  type: string;
  description: string;
  performedBy: string;
  cost: number | null;
  partsReplaced: string | null;
  nextScheduledDate: string | null;
  createdAt: string;
}

interface SensorReading {
  id: string;
  metricType: string;
  value: number;
  unit: string | null;
  timestamp: string;
}

interface PredictionAlert {
  id: string;
  riskScore: number;
  predictedFailureDate: string | null;
  recommendedAction: string;
  urgency: string;
  status: string;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "default" | "warning" | "danger" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "default" },
  UNDER_MAINTENANCE: { label: "Under Maintenance", variant: "warning" },
  DECOMMISSIONED: { label: "Decommissioned", variant: "danger" },
};

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

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: "Preventive",
  CORRECTIVE: "Corrective",
  CALIBRATION: "Calibration",
  INSPECTION: "Inspection",
  PART_REPLACEMENT: "Part Replacement",
};

const METRIC_LABELS: Record<string, string> = {
  USAGE_HOURS: "Usage Hours",
  ERROR_COUNT: "Error Count",
  TEMPERATURE: "Temperature",
  VIBRATION: "Vibration",
  POWER_CYCLES: "Power Cycles",
};

export default function EquipmentDetailPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const params = useParams();
  const id = params.id as string;

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMaintenance, setShowMaintenance] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  const fetchEquipment = useCallback(async () => {
    if (!orgId || !id) return;
    setLoading(true);
    try {
      const data = await orgApiFetch<{ equipment: EquipmentDetail }>(
        `/equipment/${id}`,
        orgId
      );
      setEquipment(data.equipment);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load equipment details");
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, id]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handlePredict = async () => {
    if (!orgId || !id) return;
    setPredicting(true);
    try {
      await orgApiFetch(`/equipment/${id}/predict`, orgId, {
        method: "POST",
        body: JSON.stringify({}),
      });
      // Refresh to show new prediction
      await fetchEquipment();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setPredicting(false);
    }
  };

  const handleAlertAction = async (alertId: string, status: string) => {
    if (!orgId || !id) return;
    try {
      await orgApiFetch(`/equipment/${id}/alerts`, orgId, {
        method: "PUT",
        body: JSON.stringify({ alertId, status }),
      });
      await fetchEquipment();
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !equipment) {
    return (
      <div className="text-center py-16">
        <p className="text-danger">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => (window.location.href = "/equipment")}
        >
          Back to Equipment
        </Button>
      </div>
    );
  }

  if (!equipment) return null;

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
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
            <Badge variant={STATUS_BADGE[equipment.status]?.variant || "default"}>
              {STATUS_BADGE[equipment.status]?.label || equipment.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {TYPE_LABELS[equipment.type] || equipment.type} &middot; S/N: {equipment.serialNumber}
          </p>
        </div>
        <Button
          icon={<Brain className="h-4 w-4" />}
          loading={predicting}
          onClick={handlePredict}
        >
          Run AI Prediction
        </Button>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      {/* Equipment Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.manufacturer && (
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Wrench className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Manufacturer</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{equipment.manufacturer}</p>
              {equipment.model && <p className="text-xs text-gray-500">Model: {equipment.model}</p>}
            </CardBody>
          </Card>
        )}
        {equipment.location && (
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Location</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{equipment.location}</p>
            </CardBody>
          </Card>
        )}
        {equipment.installDate && (
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Install Date</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(equipment.installDate).toLocaleDateString()}
              </p>
            </CardBody>
          </Card>
        )}
        {equipment.warrantyExpiry && (
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Warranty Expiry</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(equipment.warrantyExpiry).toLocaleDateString()}
              </p>
              {new Date(equipment.warrantyExpiry) < new Date() && (
                <p className="text-xs text-danger mt-0.5">Warranty expired</p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {equipment.notes && (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-700">{equipment.notes}</p>
          </CardBody>
        </Card>
      )}

      {/* Prediction Alerts */}
      <Card>
        <button
          type="button"
          onClick={() => setShowAlerts(!showAlerts)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-gray-900">
              Prediction Alerts ({equipment.predictionAlerts.length})
            </h2>
          </div>
          {showAlerts ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showAlerts && (
          <CardBody className="border-t border-gray-100 space-y-3">
            {equipment.predictionAlerts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No prediction alerts yet. Click &quot;Run AI Prediction&quot; to analyze this equipment.
              </p>
            ) : (
              equipment.predictionAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border border-gray-100 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                    <span className="text-xs text-gray-400">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{alert.recommendedAction}</p>
                  {alert.predictedFailureDate && (
                    <p className="text-xs text-danger">
                      Predicted failure: {new Date(alert.predictedFailureDate).toLocaleDateString()}
                    </p>
                  )}
                  {alert.aiProvider && (
                    <p className="text-xs text-gray-400">
                      AI: {alert.aiProvider}/{alert.aiModel}
                    </p>
                  )}
                  {alert.status === "ACTIVE" && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.id, "ACKNOWLEDGED")}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.id, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.id, "DISMISSED")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardBody>
        )}
      </Card>

      {/* Maintenance Timeline */}
      <Card>
        <button
          type="button"
          onClick={() => setShowMaintenance(!showMaintenance)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Maintenance History ({equipment.maintenanceLogs.length})
            </h2>
          </div>
          {showMaintenance ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showMaintenance && (
          <CardBody className="border-t border-gray-100 space-y-3">
            {equipment.maintenanceLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No maintenance records yet.</p>
            ) : (
              equipment.maintenanceLogs.map((log) => (
                <div key={log.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="primary">
                      {MAINTENANCE_TYPE_LABELS[log.type] || log.type}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{log.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Performed by: {log.performedBy}</p>
                  {log.cost !== null && (
                    <p className="text-xs text-gray-500">Cost: ${log.cost.toFixed(2)}</p>
                  )}
                  {log.partsReplaced && (
                    <p className="text-xs text-gray-500">Parts: {log.partsReplaced}</p>
                  )}
                  {log.nextScheduledDate && (
                    <p className="text-xs text-primary mt-1">
                      Next scheduled: {new Date(log.nextScheduledDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardBody>
        )}
      </Card>

      {/* Sensor Data */}
      <Card>
        <button
          type="button"
          onClick={() => setShowSensors(!showSensors)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-gray-900">
              Sensor Readings ({equipment.sensorReadings.length})
            </h2>
          </div>
          {showSensors ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showSensors && (
          <CardBody className="border-t border-gray-100">
            {equipment.sensorReadings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No sensor readings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Metric</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {equipment.sensorReadings.slice(0, 20).map((reading) => (
                      <tr key={reading.id}>
                        <td className="px-4 py-2 text-sm">
                          {METRIC_LABELS[reading.metricType] || reading.metricType}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono">{reading.value}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{reading.unit || "\u2014"}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {new Date(reading.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
