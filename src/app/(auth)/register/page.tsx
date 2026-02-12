"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerSchema } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "PATIENT" as "PATIENT" | "PROVIDER",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setErrors({});

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setServerError(data.error || "Registration failed");
      return;
    }

    router.push("/login?registered=true");
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Create your account
      </h2>

      {serverError && (
        <div className="mb-4 rounded-lg bg-danger-light p-3 text-sm text-danger">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          placeholder="John Doe"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          icon={<User className="h-4 w-4" />}
          error={errors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          icon={<Mail className="h-4 w-4" />}
          error={errors.email}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Min 12 chars, mixed case, number, special"
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          error={errors.password}
          required
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={(e) => updateField("confirmPassword", e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I am a
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateField("role", "PATIENT")}
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                form.role === "PATIENT"
                  ? "border-primary bg-primary-light text-primary"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => updateField("role", "PROVIDER")}
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                form.role === "PROVIDER"
                  ? "border-primary bg-primary-light text-primary"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Healthcare Provider
            </button>
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
