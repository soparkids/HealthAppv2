"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import TermTooltip from "./TermTooltip";
import SimplifiedReport from "./SimplifiedReport";
import ReportSummary from "./ReportSummary";
import {
  medicalTermsDictionary,
  generateSimplifiedReport,
} from "@/services/report-reader";

interface ReportViewerProps {
  content: string;
  summary: string | null;
  keyFindings: string | null;
}

function highlightTerms(text: string): React.ReactNode[] {
  const termKeys = Object.keys(medicalTermsDictionary);
  const escaped = termKeys.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(\\b(?:${escaped.join("|")})\\b)`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    const entry = medicalTermsDictionary[lower];
    if (entry) {
      return (
        <TermTooltip
          key={i}
          term={part}
          definition={entry.definition}
          category={entry.category}
        />
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ReportViewer({ content, summary, keyFindings }: ReportViewerProps) {
  const [simplified, setSimplified] = useState(false);

  const simplifiedText = useMemo(
    () => generateSimplifiedReport(content),
    [content]
  );

  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Radiology Report</h2>
          <button
            onClick={() => setSimplified(!simplified)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            {simplified ? (
              <>
                <EyeOff className="w-4 h-4" />
                Original View
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Simplified View
              </>
            )}
          </button>
        </div>

        {simplified ? (
          <SimplifiedReport simplifiedText={simplifiedText} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="text-gray-800 leading-relaxed">
                {highlightTerms(paragraph)}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <ReportSummary summary={summary} keyFindings={keyFindings} />
      </div>
    </div>
  );
}
