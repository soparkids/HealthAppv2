"use client";

import { useState } from "react";
import { ArrowLeft, Save, Wrench } from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch, ApiError } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

const EQUIPMENT_TYPES = [
  { value: "MRI", label: "MRI" },
  { value: "XRAY", label: "X-Ray" },
  { value: "CT_SCANNER", label: "CT Scanner" },
  { value: "ULTRASOUND", label: "Ultrasound" },
  { value: "VENTILATOR", label: "Ventilator" },
  { value: "PATIENT_MONITOR", label: "Patient Monitor" },
  { value: "INFUSION_PUMP", label: "Infusion Pump" },
  { value: "DEFIBRILLATOR", label: "Defibrillator" },
  { value: "OTHER", label: "Other" },
];

interface EquipmentFormData {
  name: string;
  type: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  installDate: string;
  warrantyExpiry: string;
  location: string;
  notes: string;
}

const initialFormData: EquipmentFormData = {
  name: "",
  type: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  installDate: "",
  warrantyExpiry: "",
  location: "",
  notes: "",
};

export default function NewEquipmentPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof EquipmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Equipment name is required";
    if (!formData.type) errors.type = "Equipment type is required";
    if (!formData.serialNumber.trim()) errors.serialNumber = "Serial number is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        name: formData.name.trim(),
        type: formData.type,
        serialNumber: formData.serialNumber.trim(),
      };
      if (formData.manufacturer.trim()) payload.manufacturer = formData.manufacturer.trim();
      if (formData.model.trim()) payload.model = formData.model.trim();
      if (formData.installDate) payload.installDate = formData.installDate;
      if (formData.warrantyExpiry) payload.warrantyExpiry = formData.warrantyExpiry;
      if (formData.location.trim()) payload.location = formData.location.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      const data = await orgApiFetch<{ equipment: { id: string } }>(
        "/equipment",
        orgId,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      window.location.href = `/equipment/${data.equipment.id}`;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/equipment")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the equipment details below</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Equipment Information</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Equipment Name *"
                placeholder="e.g., MRI Scanner Room 3"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                error={fieldErrors.name}
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    fieldErrors.type
                      ? "border-danger focus:ring-danger/30 focus:border-danger"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Select type</option>
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {fieldErrors.type && (
                  <p className="mt-1 text-sm text-danger">{fieldErrors.type}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Serial Number *"
                placeholder="e.g., SN-2024-001"
                value={formData.serialNumber}
                onChange={(e) => updateField("serialNumber", e.target.value)}
                error={fieldErrors.serialNumber}
              />
              <Input
                label="Location"
                placeholder="e.g., Building A, Room 301"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Manufacturer"
                placeholder="e.g., Siemens"
                value={formData.manufacturer}
                onChange={(e) => updateField("manufacturer", e.target.value)}
              />
              <Input
                label="Model"
                placeholder="e.g., MAGNETOM Sola"
                value={formData.model}
                onChange={(e) => updateField("model", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Install Date"
                type="date"
                value={formData.installDate}
                onChange={(e) => updateField("installDate", e.target.value)}
              />
              <Input
                label="Warranty Expiry"
                type="date"
                value={formData.warrantyExpiry}
                onChange={(e) => updateField("warrantyExpiry", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional notes about this equipment"
                rows={3}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => (window.location.href = "/equipment")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            icon={<Save className="h-4 w-4" />}
          >
            Register Equipment
          </Button>
        </div>
      </form>
    </div>
  );
}
