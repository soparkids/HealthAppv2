"use client";

import { useState, useEffect } from "react";
import { TestTube, AlertTriangle, CheckCircle, Clock, ArrowRight } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
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

const RISK_COLORS: Record<string, string> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

export default function MyResultsPage() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ results: LabResult[] }>("/my-lab-results")
      .then((data) => setResults(data.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
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
                      <Badge variant={(RISK_COLORS[result.latestInterpretation.riskLevel] || "default") as "success" | "warning" | "danger" | "default"}>
                        {result.latestInterpretation.riskLevel === "LOW" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {(result.latestInterpretation.riskLevel === "HIGH" || result.latestInterpretation.riskLevel === "CRITICAL") && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {result.latestInterpretation.riskLevel} Risk
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Interpretation
                      </Badge>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
