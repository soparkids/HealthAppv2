"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Building2,
  Rocket,
} from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { apiFetch } from "@/lib/api";
import Card, { CardBody, CardHeader, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CreateOrgPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refetch } = useOrganization();

  // Redirect patients away — only PROVIDER and ADMIN can create orgs
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "PROVIDER" && session?.user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (session?.user?.role !== "PROVIDER" && session?.user?.role !== "ADMIN") {
    return null;
  }

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(slugify(value));
  };

  const handleCreate = async () => {
    if (!name || !slug) return;
    setCreating(true);
    setError(null);

    try {
      await apiFetch("/organizations", {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      });
      refetch();
      window.location.href = "/settings";
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create organization. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/settings")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Organization
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set up a new organization for your team
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2.5">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Organization Details
              </h2>
              <p className="text-sm text-gray-500">
                Choose a name and URL slug for your organization.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Organization Name"
            placeholder="e.g., Sunrise Eye Clinic"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          <div>
            <Input
              label="URL Slug"
              placeholder="e.g., sunrise-eye-clinic"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">
              This will be used in URLs and must be unique. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>
        </CardBody>
        <CardFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/settings")}
          >
            Cancel
          </Button>
          <Button
            icon={<Rocket className="h-4 w-4" />}
            loading={creating}
            disabled={!name || !slug}
            onClick={handleCreate}
          >
            Create Organization
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
