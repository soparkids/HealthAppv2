"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  FileText,
  Calendar,
  Building2,
  Stethoscope,
  StickyNote,
  Clock,
  Image,
  FileBarChart,
  History,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useRecord } from "@/lib/hooks/use-records";
import { RECORD_TYPE_DISPLAY, RECORD_TYPE_COLORS } from "@/lib/api";

type BadgeVariant = "default" | "primary" | "accent" | "danger" | "warning" | "success";

const tabs = [
  { id: "images", label: "Images", icon: Image },
  { id: "report", label: "Report", icon: FileBarChart },
  { id: "shares", label: "Shares", icon: Share2 },
  { id: "history", label: "History", icon: History },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function RecordDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<TabId>("images");
  const [zoom, setZoom] = useState(100);

  const { data: record, loading, error } = useRecord(params.id as string);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="py-12">
        <EmptyState
          title="Record not found"
          description={error || "The requested medical record could not be found."}
          action={
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/records")}
            >
              Back to Records
            </Button>
          }
        />
      </div>
    );
  }

  const activeShares = record.sharedRecords?.filter((s) => !s.revokedAt) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.location.href = "/records")}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{record.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  (RECORD_TYPE_COLORS[record.type] as BadgeVariant) || "default"
                }
              >
                {RECORD_TYPE_DISPLAY[record.type] || record.type}
              </Badge>
              <span className="text-sm text-gray-500">
                {record.bodyPart || "N/A"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Share2 className="h-4 w-4" />}>
            Share
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />}>
            Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Image Viewer</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500 w-12 text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-96 bg-gray-900 flex items-center justify-center overflow-auto">
              <div
                style={{ transform: `scale(${zoom / 100})` }}
                className="transition-transform"
              >
                <FileText className="h-32 w-32 text-gray-600" />
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Card className="mt-6">
            <div className="border-b border-gray-100">
              <div className="flex gap-0">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <CardBody>
              {activeTab === "images" && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Full DICOM viewer will be available here. Currently showing
                    preview above.
                  </p>
                </div>
              )}
              {activeTab === "report" && (
                <div className="space-y-4">
                  {record.report ? (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                          Radiology Report
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {record.report.content}
                        </p>
                      </div>
                      {record.report.summary && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">
                            Summary
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {record.report.summary}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        Notes
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {record.notes || "No report available for this record."}
                      </p>
                    </div>
                  )}
                  {record.report && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `/records/${record.id}/report`)
                      }
                    >
                      View Full Report with AI Summary
                    </Button>
                  )}
                </div>
              )}
              {activeTab === "shares" && (
                activeShares.length === 0 ? (
                  <EmptyState
                    icon={<Share2 className="h-12 w-12" />}
                    title="No shares yet"
                    description="This record has not been shared with anyone."
                    action={
                      <Button variant="outline" size="sm" icon={<Share2 className="h-4 w-4" />}>
                        Share Record
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {activeShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {share.sharedWithEmail}
                          </p>
                          <p className="text-xs text-gray-500">
                            {share.permission} access
                            {share.expiresAt &&
                              ` \u00b7 Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant={share.permission === "DOWNLOAD" ? "primary" : "default"}>
                          {share.permission}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
              {activeTab === "history" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="text-sm text-gray-700">Record uploaded</p>
                      <p className="text-xs text-gray-400">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Info Panel */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Record Information
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Type
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {RECORD_TYPE_DISPLAY[record.type] || record.type}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Date
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(record.recordDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Facility
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.facility || "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Physician
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.referringPhysician || "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <StickyNote className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">
                    {record.notes || "No notes"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Body Part
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.bodyPart || "Not specified"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
