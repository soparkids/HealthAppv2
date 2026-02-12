"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Download,
  Shield,
  Clock,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

interface SharedRecordData {
  record: {
    id: string;
    title: string;
    type: string;
    bodyPart: string | null;
    facility: string | null;
    recordDate: string;
    fileUrl: string | null;
    fileType: string | null;
  };
  report: {
    content: string;
    summary: string | null;
  } | null;
  permission: "VIEW" | "DOWNLOAD";
  expiresAt: string | null;
}

export default function SharedRecordPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SharedRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/shared/${token}`);
        if (res.status === 410) {
          setError("expired");
        } else if (res.status === 404) {
          setError("not_found");
        } else if (!res.ok) {
          setError("error");
        } else {
          const result = await res.json();
          setData(result);
        }
      } catch {
        setError("error");
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-500">
            This shared link has expired or been revoked. Please ask the owner to share it again.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Record Not Found</h1>
          <p className="text-gray-500">
            This shared link is invalid or the record has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Shared Medical Record</h1>
              <p className="text-xs text-gray-500">Shared via PocketHealth</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {data.record.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                  {data.record.type.replace("_", " ")}
                </span>
                {data.record.bodyPart && <span>{data.record.bodyPart}</span>}
                {data.record.facility && <span>at {data.record.facility}</span>}
                <span>
                  {new Date(data.record.recordDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            {data.permission === "DOWNLOAD" && data.record.fileUrl && (
              <a
                href={data.record.fileUrl}
                download
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
          </div>
        </div>

        {data.record.fileUrl && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Medical Image
            </h3>
            <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.record.fileUrl}
                alt={data.record.title}
                className="max-w-full max-h-[600px] object-contain"
              />
            </div>
          </div>
        )}

        {data.report && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Radiology Report
            </h3>
            {data.report.summary && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Summary</p>
                <p className="text-sm text-blue-700">{data.report.summary}</p>
              </div>
            )}
            <div className="prose prose-sm max-w-none text-gray-700">
              {data.report.content.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {data.expiresAt && (
          <div className="mt-6 text-center text-sm text-gray-400">
            This link expires on {new Date(data.expiresAt).toLocaleDateString()}
          </div>
        )}
      </main>
    </div>
  );
}
