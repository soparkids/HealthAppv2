"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

function ConsentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [consentResult, setConsentResult] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    if (!token || !action) {
      setStatus("error");
      setMessage("Invalid consent link. Missing token or action.");
      return;
    }

    fetch(`/api/family/consent?token=${token}&action=${action}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
          setConsentResult(data.status);
        } else {
          setStatus("error");
          setMessage(data.error || "Something went wrong.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [token, action]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Processing your response...
              </h2>
            </>
          )}

          {status === "success" && consentResult === "accepted" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Consent Accepted
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/family"
                className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Go to Family
              </Link>
            </>
          )}

          {status === "success" && consentResult === "rejected" && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Consent Declined
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/family"
                className="inline-block px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Go to Family
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Something Went Wrong
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/family"
                className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Go to Family
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FamilyConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
