"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  X,
  Loader2,
  ChevronRight,
  CheckCircle,
  XCircle,
  Bell,
} from "lucide-react";

interface FamilyMember {
  id: string;
  relationship: string;
  consentGiven: boolean;
  member: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

interface PendingRequest {
  id: string;
  relationship: string;
  consentGiven: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  async function fetchMembers() {
    try {
      setFetchError(null);
      const res = await fetch("/api/family");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || data);
        setPendingRequests(data.pendingRequests || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setFetchError(data.error || "Failed to load family members");
      }
    } catch {
      setFetchError("Network error — could not load family members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !relationship) return;

    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, relationship }),
      });

      if (res.ok) {
        setEmail("");
        setRelationship("");
        setShowAddForm(false);
        fetchMembers();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add family member");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleConsentResponse(requestId: string, action: "accept" | "reject") {
    setRespondingTo(requestId);
    try {
      const res = await fetch("/api/family/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyMemberId: requestId, action }),
      });

      if (res.ok) {
        fetchMembers();
      }
    } finally {
      setRespondingTo(null);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Family Management</h1>
          </div>
          <p className="text-gray-500">
            Manage family members and access their medical records.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <UserPlus className="w-4 h-4" />
          Add Family Member
        </button>
      </div>

      {/* Pending Consent Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold text-gray-900">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 bg-yellow-50 rounded-xl border border-yellow-200 p-4"
              >
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-semibold">
                  {getInitials(req.user.name, req.user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {req.user.name || req.user.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    wants to add you as <strong>{req.relationship}</strong> and share medical records
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleConsentResponse(req.id, "accept")}
                    disabled={respondingTo === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleConsentResponse(req.id, "reject")}
                    disabled={respondingTo === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Add Family Member</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="family.member@example.com"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <select
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {addError && (
              <p className="text-sm text-red-600">{addError}</p>
            )}
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Member"}
            </button>
          </form>
        </div>
      )}

      {fetchError && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* My Family Members */}
      <h2 className="font-semibold text-gray-900 mb-3">My Family Members</h2>
      {members.length > 0 ? (
        <div className="space-y-3">
          {members.map((fm) => (
            <Link
              key={fm.id}
              href={`/family/${fm.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {fm.member.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fm.member.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  getInitials(fm.member.name, fm.member.email)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {fm.member.name || fm.member.email}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{fm.relationship}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      fm.consentGiven
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {fm.consentGiven ? "Consent Given" : "Consent Pending"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Family Members
          </h3>
          <p className="text-gray-500 mb-4">
            Add family members to manage their medical records.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4" />
            Add Family Member
          </button>
        </div>
      )}
    </div>
  );
}
