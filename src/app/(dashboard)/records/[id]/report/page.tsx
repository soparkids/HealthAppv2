"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import ReportViewer from "@/components/report/ReportViewer";

interface ReportData {
  id: string;
  content: string;
  summary: string | null;
  keyFindings: string | null;
  medicalRecord: {
    id: string;
    title: string;
    type: string;
    bodyPart: string | null;
    facility: string | null;
    recordDate: string;
  };
}

export default function ReportPage() {
  const params = useParams();
  const recordId = params.id as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${recordId}/terms`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load report");
        }
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [recordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-700">
            No report is available for this record yet.
          </p>
          <Link
            href={`/records/${recordId}`}
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Record
          </Link>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error || "Report not found"}</p>
          <Link
            href={`/records/${recordId}`}
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Record
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/records/${recordId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Record
        </Link>
        {report.medicalRecord && (
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {report.medicalRecord.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                {report.medicalRecord.type.replace("_", " ")}
              </span>
              {report.medicalRecord.bodyPart && (
                <span>{report.medicalRecord.bodyPart}</span>
              )}
              {report.medicalRecord.facility && (
                <span>at {report.medicalRecord.facility}</span>
              )}
              <span>
                {new Date(report.medicalRecord.recordDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      <ReportViewer
        content={report.content}
        summary={report.summary}
        keyFindings={report.keyFindings}
      />
    </div>
  );
}
