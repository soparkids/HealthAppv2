"use client";

import { useState, useEffect } from "react";
import { TestTube, AlertTriangle, CheckCircle, Clock, Sparkles, Gift } from "lucide-react";
import Card, { CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { apiFetch } from "@/lib/api";

interface LabResult {
  id: string;
  testName: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  datePerformed: string;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  latestInterpretation?: {
    id: string;
    riskLevel: string;
    confidence: number;
    createdAt: string;
  } | null;
}

type BadgeVariant = "success" | "warning" | "danger" | "default";

const RISK_COLORS: Record<string, BadgeVariant> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

interface InterpretationResult {
  id: string;
  provider: string;
  model: string;
  status: string;
  interpretation: string;
  summary: string;
  riskLevel: string;
  confidence: number;
  recommendations: string[];
  createdAt: string;
}

export default function MyResultsPage() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState(false);
  const [interpreting, setInterpreting] = useState<string | null>(null);
  const [interpretationModal, setInterpretationModal] = useState<{
    open: boolean;
    result: InterpretationResult | null;
    labResult: LabResult | null;
  }>({ open: false, result: null, labResult: null });

  useEffect(() => {
    // Fetch lab results
    apiFetch<{ results: LabResult[] }>("/my-lab-results")
      .then((data) => setResults(data.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    // Check free trial status
    apiFetch<{ freeTrialAvailable: boolean }>("/my-lab-results/check-trial")
      .then((data) => setFreeTrialAvailable(data.freeTrialAvailable))
      .catch(() => setFreeTrialAvailable(false));
  }, []);

  const handleInterpret = async (labResult: LabResult) => {
    if (interpreting) return;
    setInterpreting(labResult.id);
    setError(null);

    try {
      const data = await apiFetch<{
        interpretation: InterpretationResult;
        freeTrialUsed: boolean;
      }>(`/my-lab-results/${labResult.id}/interpret`, { method: "POST" });

      setFreeTrialAvailable(false);
      setInterpretationModal({
        open: true,
        result: data.interpretation,
        labResult,
      });

      // Update the result in the list with the new interpretation
      setResults((prev) =>
        prev.map((r) =>
          r.id === labResult.id
            ? {
                ...r,
                latestInterpretation: {
                  id: data.interpretation.id,
                  riskLevel: data.interpretation.riskLevel,
                  confidence: data.interpretation.confidence,
                  createdAt: data.interpretation.createdAt,
                },
              }
            : r
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Interpretation failed");
    } finally {
      setInterpreting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Lab Results</h1>
        <p className="text-gray-500 mt-1">
          View lab results from hospitals you&apos;re registered with.
        </p>
      </div>

      {/* Free Trial Banner */}
      {freeTrialAvailable && (
        <div className="bg-gradient-to-r from-accent to-primary rounded-lg p-4 text-white flex items-center gap-3">
          <Gift className="h-6 w-6 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Free AI Interpretation Available!</p>
            <p className="text-sm text-white/80">
              You have one free AI-powered lab result interpretation. Select a result below to use it.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
          <button className="ml-2 underline text-xs" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No lab results yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              When a hospital adds lab results to your patient record, they&apos;ll appear here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary-light p-2.5 shrink-0">
                      <TestTube className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{result.testName}</h3>
                      <p className="text-sm text-gray-700 mt-0.5">
                        Result: <span className="font-medium">{result.resultValue}</span>
                        {result.unit && ` ${result.unit}`}
                      </p>
                      {result.referenceRange && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Reference: {result.referenceRange}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(result.datePerformed).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {result.patient.firstName} {result.patient.lastName} ({result.patient.patientNumber})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    {result.latestInterpretation ? (
                      <Badge variant={RISK_COLORS[result.latestInterpretation.riskLevel] || "default"}>
                        {result.latestInterpretation.riskLevel === "LOW" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {(result.latestInterpretation.riskLevel === "HIGH" || result.latestInterpretation.riskLevel === "CRITICAL") && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {result.latestInterpretation.riskLevel} Risk
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="default">
                          <Clock className="h-3 w-3 mr-1" />
                          Awaiting Interpretation
                        </Badge>
                        {freeTrialAvailable && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<Sparkles className="h-3 w-3" />}
                            loading={interpreting === result.id}
                            disabled={!!interpreting}
                            onClick={() => handleInterpret(result)}
                          >
                            {interpreting === result.id ? "Interpreting..." : "Free Interpret"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Interpretation Results Modal */}
      <Modal
        open={interpretationModal.open}
        onClose={() => setInterpretationModal({ open: false, result: null, labResult: null })}
        title="AI Interpretation Result"
      >
        {interpretationModal.result && interpretationModal.labResult && (
          <div className="space-y-4">
            {/* Test Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">
                {interpretationModal.labResult.testName}
              </p>
              <p className="text-sm text-gray-600">
                Result: {interpretationModal.labResult.resultValue}
                {interpretationModal.labResult.unit && ` ${interpretationModal.labResult.unit}`}
              </p>
            </div>

            {/* Risk Level */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Risk Level:</span>
              <Badge variant={RISK_COLORS[interpretationModal.result.riskLevel] || "default"}>
                {interpretationModal.result.riskLevel}
              </Badge>
              <span className="text-xs text-gray-500">
                ({Math.round(interpretationModal.result.confidence * 100)}% confidence)
              </span>
            </div>

            {/* Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Summary</h4>
              <p className="text-sm text-gray-700">{interpretationModal.result.summary}</p>
            </div>

            {/* Full Interpretation */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Interpretation</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {interpretationModal.result.interpretation}
              </p>
            </div>

            {/* Recommendations */}
            {interpretationModal.result.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Recommendations</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {interpretationModal.result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-warning-light rounded-lg p-3 text-xs text-warning">
              <strong>Disclaimer:</strong> This AI interpretation is for informational purposes only
              and should not replace professional medical advice. Please consult your healthcare
              provider for any health concerns.
            </div>

            {/* Free trial notice */}
            <div className="text-center text-xs text-gray-500">
              This was your one-time free AI interpretation.
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setInterpretationModal({ open: false, result: null, labResult: null })}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
