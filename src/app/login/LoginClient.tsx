"use client";

import { useState } from "react";

interface LoginClientProps {
  showSeedButton: boolean;
}

export default function LoginClient({ showSeedButton }: LoginClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeed = async () => {
    if (!confirm("This will create default users:\n\nadmin / Davidcaleb52019***\nagent / agent123\n\nContinue?")) {
      return;
    }

    setSeeding(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "PUT",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSeedSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(data.error || "Failed to initialize users");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Vault Access</h1>
          <p className="text-zinc-500 text-sm">Enter your credentials to unlock</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {seedSuccess && (
          <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-xl p-4 text-emerald-400 text-sm text-center">
            ✓ Users created! Refreshing...
          </div>
        )}

        {showSeedButton && !seedSuccess && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="w-full bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-400 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>🔑</span>
            {seeding ? "Initializing..." : "Initialize Master Admin"}
          </button>
        )}

        <form action="/api/auth/login" method="POST" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Username</label>
            <input
              type="text"
              name="username"
              placeholder="USERNAME"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              name="password"
              placeholder="PASSWORD"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            Unlock Vault
          </button>
        </form>

        {/* SYSTEM PORTALS - CLICKABLE LINKS */}
        <div className="mt-8 flex flex-col gap-3 border-t border-zinc-800 pt-6 w-full max-w-sm mx-auto">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">System Portals</p>
          
          <a 
            href="/portal" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-zinc-900/50 border border-zinc-700/50 hover:border-purple-500/50 rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center gap-1 group cursor-pointer"
          >
            {/* 🚀 THE LABEL IS NOW "Client Loan" */}
            <span className="text-sm font-bold text-slate-300 group-hover:text-purple-400 transition-colors">🏛️ Client Loan</span>
            <span className="text-[10px] text-zinc-500 font-mono">Click to open in new tab ↗</span>
          </a>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Protected by role-based authentication
        </p>
      </div>
    </div>
  );
}
