"use client";

import { BookOpen } from "lucide-react";

interface SimplifiedReportProps {
  simplifiedText: string;
}

export default function SimplifiedReport({ simplifiedText }: SimplifiedReportProps) {
  const paragraphs = simplifiedText.split("\n\n").filter((p) => p.trim());

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Simplified Report</h3>
      </div>
      <p className="text-sm text-blue-700 mb-4">
        This is a plain-language version of your radiology report. Medical terms have been
        expanded with their definitions. Always discuss your results with your healthcare provider.
      </p>
      <div className="space-y-4">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="text-gray-800 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
