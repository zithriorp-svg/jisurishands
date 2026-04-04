"use client";

import { useState } from "react";
import { initializeMasterAdmin } from "@/lib/init-users";

interface InitButtonProps {
  needsSeed: boolean;
}

export function InitMasterButton({ needsSeed }: InitButtonProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showButton, setShowButton] = useState(needsSeed);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setResult(null);

    try {
      const response = await initializeMasterAdmin();
      
      if (response.success) {
        setResult({
          success: true,
          message: `✅ Success! Users created:\n\n👤 Admin: admin / Davidcaleb52019***\n👤 Agent: agent / agent123\n\nRefreshing page...`
        });
        setShowButton(false);
        // Refresh the page after 2 seconds
        setTimeout(() => {
          window.location.href = "/login?initialized=true";
        }, 2000);
      } else {
        setResult({
          success: false,
          message: `❌ ${response.error || "Initialization failed"}`
        });
      }
    } catch (e: any) {
      console.error("Init error:", e);
      setResult({
        success: false,
        message: `❌ Error: ${e.message || "An unexpected error occurred"}`
      });
    }

    setIsInitializing(false);
  };

  if (!showButton) {
    return null;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleInitialize}
        disabled={isInitializing}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        {isInitializing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Initializing...</span>
          </>
        ) : (
          <>
            <span className="text-xl">🔑</span>
            <span>Initialize Master Admin</span>
          </>
        )}
      </button>

      {result && (
        <div className={`rounded-xl p-4 text-sm whitespace-pre-line text-left ${
          result.success 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
