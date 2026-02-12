"use client";

import { useState } from "react";
import {
  Search,
  Stethoscope,
  MapPin,
  Phone,
  Share2,
  Loader2,
} from "lucide-react";

interface ProviderResult {
  id: string;
  specialty: string | null;
  facilityName: string | null;
  facilityAddress: string | null;
  phone: string | null;
  bio: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export default function ProviderSearchPage() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (specialty) params.set("specialty", specialty);

      const res = await fetch(`/api/providers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Find Providers</h1>
        </div>
        <p className="text-gray-500">
          Search for healthcare providers to share your records with.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or facility..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Specialties</option>
            <option value="Radiology">Radiology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Neurology">Neurology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Oncology">Oncology</option>
            <option value="General Practice">General Practice</option>
            <option value="Internal Medicine">Internal Medicine</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : providers.length > 0 ? (
        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {provider.user.name || provider.user.email}
                    </h3>
                    {provider.specialty && (
                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium mt-1">
                        {provider.specialty}
                      </span>
                    )}
                    {provider.bio && (
                      <p className="text-sm text-gray-500 mt-2">{provider.bio}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                      {provider.facilityName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {provider.facilityName}
                          {provider.facilityAddress && ` - ${provider.facilityAddress}`}
                        </span>
                      )}
                      {provider.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {provider.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
                  <Share2 className="w-4 h-4" />
                  Share Records
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Providers Found
          </h3>
          <p className="text-gray-500">
            Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Search for Providers
          </h3>
          <p className="text-gray-500">
            Enter a name, specialty, or location to find providers.
          </p>
        </div>
      )}
    </div>
  );
}
