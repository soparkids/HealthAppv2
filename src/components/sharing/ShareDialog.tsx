"use client";

import { useState } from "react";
import { X, Link2, Mail } from "lucide-react";
import ShareLinkForm from "./ShareLinkForm";
import ShareEmailForm from "./ShareEmailForm";
import ActiveShares from "./ActiveShares";

interface ShareDialogProps {
  recordId: string;
  recordTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "link" | "email";

export default function ShareDialog({ recordId, recordTitle, isOpen, onClose }: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isOpen) return null;

  function handleShareCreated() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share Record</h2>
            <p className="text-sm text-gray-500 mt-0.5">{recordTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
            <button
              onClick={() => setActiveTab("link")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "link"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Link2 className="w-4 h-4" />
              Share Link
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "email"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>

          {activeTab === "link" ? (
            <ShareLinkForm recordId={recordId} onShareCreated={handleShareCreated} />
          ) : (
            <ShareEmailForm recordId={recordId} onShareCreated={handleShareCreated} />
          )}

          <div className="mt-6 pt-5 border-t border-gray-200">
            <ActiveShares recordId={recordId} refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
