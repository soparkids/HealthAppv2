"use client";

import { useState, useRef } from "react";
import { Info } from "lucide-react";

interface TermTooltipProps {
  term: string;
  definition: string;
  category: string;
}

export default function TermTooltip({ term, definition, category }: TermTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setIsVisible(false), 200);
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="cursor-help border-b-2 border-dotted border-blue-400 text-blue-700 font-medium">
        {term}
      </span>
      {isVisible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 rounded-lg bg-white shadow-lg border border-gray-200 p-3 text-sm">
          <span className="flex items-center gap-1.5 mb-1">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-gray-900">{term}</span>
            <span className="ml-auto text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
              {category}
            </span>
          </span>
          <span className="block text-gray-600 leading-relaxed">{definition}</span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
        </span>
      )}
    </span>
  );
}
