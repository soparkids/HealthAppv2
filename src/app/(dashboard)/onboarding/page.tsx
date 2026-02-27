"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Hash,
  ToggleLeft,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch } from "@/lib/api";

const FEATURES = [
  { key: "appointments", label: "Appointments", description: "Schedule and manage patient appointments" },
  { key: "lab_results", label: "Lab Results", description: "Track and interpret lab test results" },
  { key: "ai_interpretation", label: "AI Interpretation", description: "AI-powered lab result analysis" },
  { key: "eye_consultation", label: "Eye Consultations", description: "Bilateral eye examination forms" },
  { key: "medical_history", label: "Medical History", description: "Immutable patient medical history" },
  { key: "predictive_maintenance", label: "Equipment Maintenance", description: "Predictive maintenance for medical equipment" },
  { key: "provider_portal", label: "Provider Portal", description: "External provider access to shared records" },
];

const steps = [
  { id: "prefix", label: "Patient Prefix", icon: Hash },
  { id: "features", label: "Features", icon: ToggleLeft },
  { id: "invite", label: "Invite Team", icon: UserPlus },
  { id: "done", label: "All Set", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { activeOrg, orgId } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Prefix
  const [prefix, setPrefix] = useState("");
  const [prefixSaving, setPrefixSaving] = useState(false);

  // Step 2: Features
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({
    appointments: true,
    lab_results: true,
    ai_interpretation: true,
    eye_consultation: false,
    medical_history: true,
    predictive_maintenance: false,
    provider_portal: false,
  });

  // Step 3: Invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DOCTOR");
  const [invitedMembers, setInvitedMembers] = useState<Array<{ email: string; role: string }>>([]);
  const [inviting, setInviting] = useState(false);

  // Error state
  const [stepError, setStepError] = useState<string | null>(null);

  const handleSavePrefix = async () => {
    if (!orgId || !prefix.trim()) return;
    setPrefixSaving(true);
    setStepError(null);
    try {
      await orgApiFetch("/patients/prefix", orgId, {
        method: "PUT",
        body: JSON.stringify({ prefix: prefix.trim().toUpperCase() }),
      });
      setCurrentStep(1);
    } catch {
      setStepError("Failed to save prefix. You can skip and set it later in Settings.");
    }
    setPrefixSaving(false);
  };

  const handleSaveFeatures = async () => {
    if (!orgId) return;
    setStepError(null);
    try {
      const features = Object.entries(enabledFeatures).map(([key, enabled]) => ({
        featureKey: key,
        enabled,
      }));
      await orgApiFetch(`/organizations/${orgId}/features`, orgId, {
        method: "PATCH",
        body: JSON.stringify({ features }),
      });
      setCurrentStep(2);
    } catch {
      setStepError("Failed to save features. You can adjust them later in Settings.");
      setCurrentStep(2);
    }
  };

  const handleInvite = async () => {
    if (!orgId || !inviteEmail.trim()) return;
    setInviting(true);
    setStepError(null);
    try {
      await orgApiFetch(`/organizations/${orgId}/members`, orgId, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInvitedMembers((prev) => [...prev, { email: inviteEmail.trim(), role: inviteRole }]);
      setInviteEmail("");
    } catch {
      setStepError("Failed to add member. They may need to register first.");
    }
    setInviting(false);
  };

  const toggleFeature = (key: string) => {
    setEnabledFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-light text-primary text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          Setting up {activeOrg?.name || "your organization"}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Let&apos;s get you started
        </h1>
        <p className="text-gray-500 mt-1">
          Configure your organization in a few quick steps.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isDone
                    ? "bg-success/10 text-success"
                    : isActive
                    ? "bg-primary-light text-primary"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px ${isDone ? "bg-success" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {stepError && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {stepError}
          <button className="ml-2 underline text-xs" onClick={() => setStepError(null)}>Dismiss</button>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 0 && (
        <Card>
          <CardBody className="space-y-4 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary-light p-2.5">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Patient Number Prefix</h2>
                <p className="text-sm text-gray-500">
                  Set a prefix for auto-generated patient numbers (e.g., LUTH, UCH, FMC).
                </p>
              </div>
            </div>

            <Input
              label="Prefix"
              placeholder="e.g., LUTH, UCH, FMC"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
            <p className="text-xs text-gray-400">
              Patient numbers will look like: <strong>{prefix || "P"}0001</strong>, <strong>{prefix || "P"}0002</strong>, etc.
            </p>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Skip
              </Button>
              <Button
                icon={<ArrowRight className="h-4 w-4" />}
                loading={prefixSaving}
                onClick={handleSavePrefix}
                disabled={!prefix.trim()}
              >
                Save & Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardBody className="space-y-4 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary-light p-2.5">
                <ToggleLeft className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Enable Features</h2>
                <p className="text-sm text-gray-500">
                  Choose which modules your hospital needs. You can change these anytime in Settings.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {FEATURES.map((feature) => (
                <button
                  key={feature.key}
                  onClick={() => toggleFeature(feature.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    enabledFeatures[feature.key]
                      ? "border-primary bg-primary-light/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${enabledFeatures[feature.key] ? "text-primary" : "text-gray-700"}`}>
                      {feature.label}
                    </p>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                      enabledFeatures[feature.key] ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 mx-1 rounded-full bg-white shadow" />
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setCurrentStep(0)}
              >
                Back
              </Button>
              <Button
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={handleSaveFeatures}
              >
                Save & Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardBody className="space-y-4 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary-light p-2.5">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Invite Team Members</h2>
                <p className="text-sm text-gray-500">
                  Add doctors, nurses, and receptionists to your organization.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="ADMIN">Admin</option>
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="RECEPTIONIST">Receptionist</option>
              </select>
              <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail.trim()}>
                Add
              </Button>
            </div>

            {invitedMembers.length > 0 && (
              <div className="space-y-2">
                {invitedMembers.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-success/5 border border-success/20"
                  >
                    <span className="text-sm text-gray-700">{m.email}</span>
                    <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setCurrentStep(1)}
              >
                Back
              </Button>
              <Button
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => setCurrentStep(3)}
              >
                {invitedMembers.length > 0 ? "Continue" : "Skip for Now"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardBody className="text-center space-y-4 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">You&apos;re all set!</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Your organization is configured and ready to go. You can always adjust settings later.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/settings")}
              >
                Go to Settings
              </Button>
              <Button
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => router.push("/patients/new")}
              >
                Add First Patient
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
