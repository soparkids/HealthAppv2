"use client";

import { FileText, AlertCircle } from "lucide-react";

interface ReportSummaryProps {
  summary: string | null;
  keyFindings: string | null;
}

export default function ReportSummary({ summary, keyFindings }: ReportSummaryProps) {
  const findings = keyFindings
    ? keyFindings.split("\n").filter((f) => f.trim())
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Report Summary
        </h3>
        {summary ? (
          <p className="text-gray-700 leading-relaxed">{summary}</p>
        ) : (
          <p className="text-gray-400 italic">No summary available.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-teal-500" />
          Key Findings
        </h3>
        {findings.length > 0 ? (
          <ul className="space-y-2">
            {findings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                <span className="leading-relaxed">{finding}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 italic">No key findings recorded.</p>
        )}
      </div>
    </div>
  );
}
