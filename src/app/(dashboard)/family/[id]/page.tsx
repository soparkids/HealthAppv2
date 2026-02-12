"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Shield,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

interface FamilyMemberDetail {
  id: string;
  relationship: string;
  consentGiven: boolean;
  member: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    medicalRecords: {
      id: string;
      title: string;
      type: string;
      recordDate: string;
      bodyPart: string | null;
    }[];
  };
}

export default function FamilyMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  const [member, setMember] = useState<FamilyMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchMember() {
      try {
        const res = await fetch(`/api/family/${memberId}`);
        if (res.ok) {
          const data = await res.json();
          setMember(data);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchMember();
  }, [memberId]);

  async function toggleConsent() {
    if (!member) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/family/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentGiven: !member.consentGiven }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMember(updated);
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Are you sure you want to remove this family member?")) return;
    try {
      const res = await fetch(`/api/family/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/family");
      }
    } catch {
      // silently handle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">Family member not found.</p>
          <Link
            href="/family"
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Family
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/family"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Family
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            {member.member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.member.avatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {member.member.name || member.member.email}
            </h1>
            <p className="text-sm text-gray-500">{member.member.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Relationship: {member.relationship}
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      </div>

      {/* Consent Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Consent Management
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Record Access Consent</p>
            <p className="text-sm text-gray-500">
              {member.consentGiven
                ? "This member has granted you access to view their records."
                : "Consent has not been granted yet."}
            </p>
          </div>
          <button
            onClick={toggleConsent}
            disabled={updating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              member.consentGiven
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            {member.consentGiven ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                Consent Granted
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Grant Consent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Family Member's Records */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Medical Records
        </h2>
        {member.consentGiven && member.member.medicalRecords.length > 0 ? (
          <div className="space-y-2">
            {member.member.medicalRecords.map((record) => (
              <Link
                key={record.id}
                href={`/records/${record.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{record.title}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                      {record.type.replace("_", " ")}
                    </span>
                    {record.bodyPart && <span>{record.bodyPart}</span>}
                    <span>
                      {new Date(record.recordDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
              </Link>
            ))}
          </div>
        ) : !member.consentGiven ? (
          <p className="text-sm text-gray-400 italic">
            Consent is required to view medical records.
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No medical records found.
          </p>
        )}
      </div>
    </div>
  );
}
