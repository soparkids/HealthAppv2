"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Status = "loading" | "success" | "error" | "idle";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "idle");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    }

    verify();
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    setResendMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      setResendMessage(data.message || "Verification email sent.");
    } catch {
      setResendMessage("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="text-center">
      {status === "loading" && (
        <>
          <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Verifying your email...
          </h2>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Email verified!
          </h2>
          <p className="mt-2 text-gray-600">{message}</p>
          <Link href="/login">
            <Button className="mt-6">Sign in to your account</Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Verification failed
          </h2>
          <p className="mt-2 text-gray-600">{message}</p>

          <div className="mt-6 text-left">
            <p className="text-sm text-gray-600 mb-3">
              Request a new verification link:
            </p>
            <form onSubmit={handleResend} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
              <Button type="submit" loading={resending} className="w-full">
                Resend verification email
              </Button>
            </form>
            {resendMessage && (
              <p className="mt-2 text-sm text-green-600">{resendMessage}</p>
            )}
          </div>
        </>
      )}

      {status === "idle" && (
        <>
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-gray-600">
            We sent a verification link to your email address. Click the link to
            verify your account.
          </p>

          <div className="mt-6 text-left">
            <p className="text-sm text-gray-600 mb-3">
              Didn&apos;t receive the email? Request a new link:
            </p>
            <form onSubmit={handleResend} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
              <Button type="submit" loading={resending} className="w-full">
                Resend verification email
              </Button>
            </form>
            {resendMessage && (
              <p className="mt-2 text-sm text-green-600">{resendMessage}</p>
            )}
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Already verified?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Loading...
          </h2>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
