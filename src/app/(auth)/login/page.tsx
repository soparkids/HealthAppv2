"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("Too many")) {
        setError("Too many login attempts. Try again later.");
        return;
      }
      setError(
        "We couldn't sign you in. Check your email and password. If you're using the production site, register here first or use an account that exists in that environment's database (seed data from local dev does not copy to production automatically)."
      );
      return;
    }

    // Full page load so the session cookie is present before hitting protected routes.
    // router.push alone can race middleware and bounce back to /login.
    window.location.href = "/dashboard";
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Sign in to your account
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-danger-light p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          required
        />

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary-hover"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
