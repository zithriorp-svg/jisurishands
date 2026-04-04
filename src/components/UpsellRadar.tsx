"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UpsellCandidate {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  trustScore: number;
  activeLoans: number;
  totalOutstanding: number;
  lastLoanDate: string | null;
}

export default function UpsellRadar() {
  const [candidates, setCandidates] = useState<UpsellCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    fetch('/api/upsell', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.candidates) {
          setCandidates(data.candidates);
        }
        setLoading(false);
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          console.error(e);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🎯</span> Prime Upsell Opportunities
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-zinc-800 rounded-xl"></div>
          <div className="h-12 bg-zinc-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return null; // Don't show card if no candidates
  }

  const displayCandidates = expanded ? candidates : candidates.slice(0, 3);

  return (
    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <span>🎯</span> Prime Upsell Opportunities
        </h2>
        <span className="text-xs text-amber-400/60 font-mono">
          {candidates.length} PRIME
        </span>
      </div>

      <div className="space-y-3">
        {displayCandidates.map((candidate) => (
          <div 
            key={candidate.id}
            className="flex justify-between items-center p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700 transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-bold text-white">
                  {candidate.firstName} {candidate.lastName}
                </p>
                <span className="bg-zinc-700 text-emerald-400 text-xs font-bold px-2 py-1 rounded">
                  TRUST: {candidate.trustScore}
                </span>
              </div>
              <div className="flex gap-4 mt-1">
                {candidate.activeLoans === 0 ? (
                  <span className="text-xs text-zinc-500">No active loans</span>
                ) : (
                  <span className="text-xs text-emerald-400">
                    Near completion (₱{candidate.totalOutstanding.toLocaleString()} remaining)
                  </span>
                )}
                {candidate.phone && (
                  <span className="text-xs text-zinc-600">{candidate.phone}</span>
                )}
              </div>
            </div>
            <Link
              href={`/clients/${candidate.id}`}
              className="ml-4 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-400 font-bold text-sm rounded-xl border border-amber-500/30 transition-all flex items-center gap-2"
            >
              <span>💰</span> Offer Repeat Loan
            </Link>
          </div>
        ))}
      </div>

      {candidates.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          {expanded ? '▲ Show less' : `▼ Show ${candidates.length - 3} more`}
        </button>
      )}
    </div>
  );
}
