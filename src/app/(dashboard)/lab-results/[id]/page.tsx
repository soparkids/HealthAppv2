"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Calendar,
  User,
  StickyNote,
  Brain,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Clock,
  CheckCircle2,
  ListChecks,
  History,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
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

interface InterpretationHistory {
  id: string;
  interpretationText: string;
  riskLevel: string;
  confidence: number;
  recommendations: string[];
  createdAt: string;
}

const RISK_LEVEL_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  NORMAL: { label: "Normal", variant: "success" },
  LOW: { label: "Low", variant: "primary" },
  MODERATE: { label: "Moderate", variant: "warning" },
  HIGH: { label: "High", variant: "danger" },
  CRITICAL: { label: "Critical", variant: "danger" },
};

export default function LabResultDetailPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;

  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [interpreting, setInterpreting] = useState(false);
  const [interpretationHistory, setInterpretationHistory] = useState<InterpretationHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchLabResult = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await orgApiFetch<LabResult>(
        `/lab-results/${resultId}`,
        orgId
      );
      setLabResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lab result.");
    } finally {
      setLoading(false);
    }
  }, [orgId, resultId]);

  useEffect(() => {
    fetchLabResult();
  }, [fetchLabResult]);

  const triggerInterpretation = async () => {
    if (!orgId) return;
    setInterpreting(true);
    setError("");
    try {
      const data = await orgApiFetch<LabResult>(
        `/lab-results/${resultId}/interpret`,
        orgId,
        { method: "POST" }
      );
      setLabResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to interpret lab result.");
    } finally {
      setInterpreting(false);
    }
  };

  const fetchHistory = async () => {
    if (!orgId) return;
    setHistoryLoading(true);
    try {
      const data = await orgApiFetch<InterpretationHistory[]>(
        `/lab-results/${resultId}/interpret`,
        orgId
      );
      setInterpretationHistory(Array.isArray(data) ? data : []);
    } catch {
      // silently handle
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && interpretationHistory.length === 0) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
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
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !labResult) {
    return (
      <div className="py-12">
        <EmptyState
          title="Lab result not found"
          description={error || "The requested lab result could not be found."}
          action={
            <Button
              variant="outline"
              onClick={() => router.push("/lab-results")}
            >
              Back to Lab Results
            </Button>
          }
        />
      </div>
    );
  }

  if (!labResult) return null;

  const riskInfo = labResult.riskLevel
    ? RISK_LEVEL_BADGE_MAP[labResult.riskLevel]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/lab-results")}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {labResult.testName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {riskInfo && (
                <Badge variant={riskInfo.variant}>{riskInfo.label} Risk</Badge>
              )}
              <span className="text-sm text-gray-500">
                {new Date(labResult.datePerformed).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {!labResult.interpretedAt && (
          <Button
            icon={<Brain className="h-4 w-4" />}
            loading={interpreting}
            onClick={triggerInterpretation}
          >
            Interpret with AI
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-danger-light text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lab Result Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Lab Result Information
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FlaskConical className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Test Name
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {labResult.testName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Result
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {labResult.resultValue}
                      {labResult.unit && (
                        <span className="text-gray-500 ml-1">
                          {labResult.unit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Reference Range
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {labResult.referenceRange || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Date Performed
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(labResult.datePerformed).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {labResult.notes && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-start gap-3">
                    <StickyNote className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {labResult.notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* AI Interpretation */}
          {interpreting ? (
            <Card>
              <CardBody>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative mb-4">
                    <Brain className="h-12 w-12 text-primary" />
                    <Sparkles className="h-5 w-5 text-warning absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Analyzing Lab Result...
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Our AI is interpreting the lab result. This may take a moment.
                  </p>
                  <Spinner size="md" />
                </div>
              </CardBody>
            </Card>
          ) : labResult.interpretedAt ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    AI Interpretation
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-xs text-gray-500">
                    Interpreted{" "}
                    {new Date(labResult.interpretedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-5">
                {/* Risk Level & Confidence */}
                <div className="flex flex-wrap items-center gap-4">
                  {riskInfo && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Risk Level:</span>
                      <Badge variant={riskInfo.variant}>
                        {riskInfo.label}
                      </Badge>
                    </div>
                  )}
                  {labResult.confidence !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Confidence:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${labResult.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {labResult.confidence}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interpretation Text */}
                {labResult.interpretationText && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Summary
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {labResult.interpretationText}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {labResult.recommendations &&
                  labResult.recommendations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ListChecks className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Recommendations
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {labResult.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-sm text-gray-700"
                          >
                            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-medium shrink-0">
                              {idx + 1}
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Re-interpret Button */}
                <div className="border-t border-gray-100 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Brain className="h-4 w-4" />}
                    loading={interpreting}
                    onClick={triggerInterpretation}
                  >
                    Re-interpret with AI
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="flex flex-col items-center justify-center py-12">
                  <Brain className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No AI Interpretation Yet
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm text-center">
                    Use AI to analyze this lab result and get risk assessment,
                    clinical insights, and recommendations.
                  </p>
                  <Button
                    icon={<Brain className="h-4 w-4" />}
                    onClick={triggerInterpretation}
                  >
                    Interpret with AI
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Interpretation History */}
          <Card>
            <CardHeader>
              <button
                onClick={toggleHistory}
                className="flex items-center gap-2 w-full text-left"
              >
                <History className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Interpretation History
                </h2>
              </button>
            </CardHeader>
            {showHistory && (
              <CardBody>
                {historyLoading ? (
                  <div className="flex justify-center py-6">
                    <Spinner size="md" />
                  </div>
                ) : interpretationHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No interpretation history available.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {interpretationHistory.map((entry, idx) => {
                      const entryRisk = entry.riskLevel
                        ? RISK_LEVEL_BADGE_MAP[entry.riskLevel]
                        : null;
                      return (
                        <div
                          key={entry.id || idx}
                          className="p-4 rounded-lg border border-gray-100 bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {entryRisk && (
                                <Badge variant={entryRisk.variant}>
                                  {entryRisk.label}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                Confidence: {entry.confidence}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {new Date(entry.createdAt).toLocaleDateString()}{" "}
                              {new Date(entry.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {entry.interpretationText}
                          </p>
                          {entry.recommendations &&
                            entry.recommendations.length > 0 && (
                              <ul className="space-y-1">
                                {entry.recommendations.map((rec, ridx) => (
                                  <li
                                    key={ridx}
                                    className="text-xs text-gray-500 flex items-start gap-2"
                                  >
                                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            )}
          </Card>
        </div>

        {/* Sidebar - Patient Info */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Patient Information
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {labResult.patient.firstName} {labResult.patient.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {labResult.patient.patientNumber}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Patient ID
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {labResult.patient.patientNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Record Created
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(labResult.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
