"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import {
  getAllTermsSorted,
  searchTerms,
  getTermsByCategory,
  type MedicalTerm,
} from "@/services/report-reader";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const categoryColors: Record<string, string> = {
  Anatomy: "bg-purple-100 text-purple-700",
  Findings: "bg-orange-100 text-orange-700",
  Diagnosis: "bg-red-100 text-red-700",
  Imaging: "bg-blue-100 text-blue-700",
  Conditions: "bg-yellow-100 text-yellow-700",
  Procedures: "bg-green-100 text-green-700",
};

function TermCard({ term }: { term: MedicalTerm }) {
  const colorClass = categoryColors[term.category] || "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-lg">{term.term}</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${colorClass}`}>
          {term.category}
        </span>
      </div>
      <p className="text-gray-600 leading-relaxed">{term.definition}</p>
    </div>
  );
}

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allTerms = useMemo(() => getAllTermsSorted(), []);
  const categories = useMemo(() => Object.keys(getTermsByCategory()).sort(), []);

  const filteredTerms = useMemo(() => {
    let terms = query ? searchTerms(query) : allTerms;

    if (selectedLetter) {
      terms = terms.filter((t) => t.term[0].toUpperCase() === selectedLetter);
    }

    if (selectedCategory) {
      terms = terms.filter((t) => t.category === selectedCategory);
    }

    return terms;
  }, [query, selectedLetter, selectedCategory, allTerms]);

  const availableLetters = useMemo(() => {
    const letters = new Set(allTerms.map((t) => t.term[0].toUpperCase()));
    return letters;
  }, [allTerms]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Medical Glossary</h1>
        </div>
        <p className="text-gray-500">
          Search and browse common radiology and medical terms with plain-language definitions.
        </p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search terms or definitions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedLetter(null);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {alphabet.map((letter) => {
          const available = availableLetters.has(letter);
          const active = selectedLetter === letter;
          return (
            <button
              key={letter}
              onClick={() => {
                setSelectedLetter(active ? null : letter);
                setQuery("");
              }}
              disabled={!available}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : available
                  ? "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                  : "bg-gray-50 text-gray-300 cursor-not-allowed"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-blue-600 text-white"
                : categoryColors[cat]
                  ? `${categoryColors[cat]} hover:opacity-80`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {filteredTerms.length} term{filteredTerms.length !== 1 ? "s" : ""} found
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTerms.map((term) => (
          <TermCard key={term.term} term={term} />
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No terms found matching your search.</p>
        </div>
      )}
    </div>
  );
}
