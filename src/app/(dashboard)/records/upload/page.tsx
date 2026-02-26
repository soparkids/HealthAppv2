"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileText,
  ClipboardList,
  Eye,
  AlertCircle,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FileUpload from "@/components/ui/FileUpload";

const steps = [
  { id: 1, label: "Upload Files", icon: Upload },
  { id: 2, label: "Enter Details", icon: ClipboardList },
  { id: 3, label: "Review & Submit", icon: Eye },
];

const recordTypes = [
  { label: "X-Ray", value: "XRAY" },
  { label: "MRI", value: "MRI" },
  { label: "CT Scan", value: "CT_SCAN" },
  { label: "Ultrasound", value: "ULTRASOUND" },
  { label: "Other", value: "OTHER" },
];
const acceptedFormats = ".dcm,.pdf,.jpg,.jpeg,.png";

export default function RecordUploadPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    date: "",
    facility: "",
    bodyPart: "",
    notes: "",
  });

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type || "OTHER",
          recordDate: formData.date,
          facility: formData.facility || undefined,
          bodyPart: formData.bodyPart || undefined,
          notes: formData.notes || undefined,
          fileType: files[0]?.type || undefined,
          fileSize: files[0]?.size || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save record");
      }

      window.location.href = "/records";
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = files.length > 0;
  const canProceedStep2 = formData.title && formData.type && formData.date;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/records")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Record</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Add a new medical record to your collection
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isComplete = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-1 ${
                  isActive
                    ? "bg-primary-light text-primary"
                    : isComplete
                    ? "bg-success-light text-success"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isComplete ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-4 shrink-0 ${
                    isComplete ? "bg-success" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        {currentStep === 1 && (
          <>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Upload Files
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop your medical imaging files or documents
              </p>
            </CardHeader>
            <CardBody>
              <FileUpload
                accept={acceptedFormats}
                multiple
                onFilesSelected={handleFilesSelected}
                files={files}
                onRemoveFile={handleRemoveFile}
              />
              <p className="mt-3 text-xs text-gray-400">
                Accepted formats: DICOM (.dcm), PDF, JPG, PNG
              </p>
            </CardBody>
          </>
        )}

        {currentStep === 2 && (
          <>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Record Details
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Provide information about this medical record
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Title"
                placeholder="e.g., Chest X-Ray"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Record Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Select type</option>
                    {recordTypes.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Facility"
                  placeholder="e.g., City General Hospital"
                  value={formData.facility}
                  onChange={(e) =>
                    setFormData({ ...formData, facility: e.target.value })
                  }
                />
                <Input
                  label="Body Part"
                  placeholder="e.g., Chest, Head, Knee"
                  value={formData.bodyPart}
                  onChange={(e) =>
                    setFormData({ ...formData, bodyPart: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </CardBody>
          </>
        )}

        {currentStep === 3 && (
          <>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Review & Submit
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Review your record details before uploading
              </p>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Files
                </h3>
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Details
                </h3>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Title", value: formData.title },
                    { label: "Type", value: recordTypes.find((rt) => rt.value === formData.type)?.label || formData.type },
                    { label: "Date", value: formData.date },
                    { label: "Facility", value: formData.facility || "N/A" },
                    { label: "Body Part", value: formData.bodyPart || "N/A" },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-xs text-gray-500">{item.label}</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {formData.notes && (
                  <div className="mt-3">
                    <dt className="text-xs text-gray-500">Notes</dt>
                    <dd className="text-sm text-gray-700 mt-0.5">
                      {formData.notes}
                    </dd>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Saving record...</span>
                    <span className="text-primary font-medium">Processing</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
                  </div>
                </div>
              )}
            </CardBody>
          </>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 1}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        {currentStep < 3 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2)
            }
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            icon={<Upload className="h-4 w-4" />}
          >
            Upload Record
          </Button>
        )}
      </div>
    </div>
  );
}
