"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Zap, Check, X, AlertTriangle } from "lucide-react";

interface RedeploymentCandidate {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  trustScore: number;
  trustTier: string;
  activeLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  lastLoanDate: string | null;
}

interface LiquidityData {
  vaultCash: number;
  deployableCapital: number;
  standardLoanAmount: number;
}

interface ProcessingState {
  [clientId: number]: 'idle' | 'processing' | 'success' | 'error';
}

interface ErrorState {
  [clientId: number]: string;
}

export default function CapitalRedeploymentQueue() {
  const [candidates, setCandidates] = useState<RedeploymentCandidate[]>([]);
  const [liquidity, setLiquidity] = useState<LiquidityData>({
    vaultCash: 0,
    deployableCapital: 0,
    standardLoanAmount: 5000
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({});
  const [errors, setErrors] = useState<ErrorState>({});

  const fetchData = useCallback(async () => {
    const controller = new AbortController();

    try {
      // Fetch redeployment candidates
      const candidatesRes = await fetch('/api/upsell', { signal: controller.signal });
      const candidatesData = await candidatesRes.json();

      if (candidatesData.candidates) {
        // Filter for Trust Score >= 85 and 0 active loans
        const primeCandidates = candidatesData.candidates.filter(
          (c: RedeploymentCandidate) => c.trustScore >= 85 && c.activeLoans === 0
        );
        setCandidates(primeCandidates);
      }

      // Fetch liquidity data
      const liquidityRes = await fetch('/api/vault-cash', { signal: controller.signal });
      const liquidityData = await liquidityRes.json();

      if (liquidityData.vaultCash !== undefined) {
        setLiquidity({
          vaultCash: Number(liquidityData.vaultCash) || 0,
          deployableCapital: (Number(liquidityData.vaultCash) || 0) * 0.85,
          standardLoanAmount: 5000
        });
      }

      setLoading(false);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        setLoading(false);
      }
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [fetchData]);

  const handleFastTrack = async (clientId: number) => {
    setProcessing(prev => ({ ...prev, [clientId]: 'processing' }));
    setErrors(prev => ({ ...prev, [clientId]: '' }));

    try {
      const res = await fetch('/api/fast-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });

      const data = await res.json();

      if (data.success) {
        setProcessing(prev => ({ ...prev, [clientId]: 'success' }));
        // Update liquidity
        setLiquidity(prev => ({
          ...prev,
          vaultCash: data.newVaultCash ?? prev.vaultCash - 5000,
          deployableCapital: data.newDeployableCapital ?? prev.deployableCapital - 5000
        }));
        // Remove from candidates list
        setTimeout(() => {
          setCandidates(prev => prev.filter(c => c.id !== clientId));
        }, 2000);
      } else {
        setProcessing(prev => ({ ...prev, [clientId]: 'error' }));
        setErrors(prev => ({ ...prev, [clientId]: data.error || 'Failed to process' }));
      }
    } catch (e: any) {
      setProcessing(prev => ({ ...prev, [clientId]: 'error' }));
      setErrors(prev => ({ ...prev, [clientId]: e.message || 'Network error' }));
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>⚡</span> Capital Re-deployment Queue
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

  const canDisburse = liquidity.deployableCapital >= liquidity.standardLoanAmount;
  const displayCandidates = expanded ? candidates : candidates.slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
          <span>⚡</span> Capital Re-deployment Queue
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400/60 font-mono">
            {candidates.length} PRIME CANDIDATES
          </span>
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">
            1-CLICK READY
          </span>
        </div>
      </div>

      {/* Liquidity Buffer Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
          <p className="text-xs text-zinc-500 uppercase mb-1">Available Vault Cash</p>
          <p className="text-xl font-bold text-white">
            ₱{liquidity.vaultCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30">
          <p className="text-xs text-emerald-400 uppercase mb-1">⚡ Deployable Capital (85%)</p>
          <p className="text-xl font-bold text-emerald-400">
            ₱{liquidity.deployableCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">15% safety reserve maintained</p>
        </div>
      </div>

      {/* Safety Lock Warning */}
      {!canDisburse && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <p className="text-xs text-rose-400">
            Safety Lock Active: Deployable capital below ₱5,000 threshold
          </p>
        </div>
      )}

      {/* Candidates List */}
      <div className="space-y-3">
        {displayCandidates.map((candidate) => {
          const state = processing[candidate.id] || 'idle';
          const errorMsg = errors[candidate.id];
          const isDisabled = !canDisburse || state === 'success';

          return (
            <div
              key={candidate.id}
              className="flex justify-between items-start p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700 transition-all"
            >
              {/* Client Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-white">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  <span className="bg-zinc-700 text-emerald-400 text-xs font-bold px-2 py-1 rounded">
                    TRUST: {candidate.trustScore}
                  </span>
                  {candidate.trustScore >= 90 && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">
                      PRIME
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 flex-wrap">
                  <span className="text-xs text-zinc-500">No active loans</span>
                  {candidate.totalRepaid > 0 && (
                    <span className="text-xs text-emerald-400">
                      Repaid: ₱{candidate.totalRepaid.toLocaleString()}
                    </span>
                  )}
                  {candidate.phone && (
                    <span className="text-xs text-zinc-600">{candidate.phone}</span>
                  )}
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleFastTrack(candidate.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-xl transition-all ${
                    state === 'success'
                      ? 'bg-emerald-500 text-white'
                      : state === 'processing'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                      : state === 'error'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : canDisburse
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed border border-zinc-600'
                  }`}
                  title={!canDisburse ? 'Insufficient deployable capital' : 'Fast-track ₱5,000 micro-loan'}
                >
                  {state === 'success' ? (
                    <>
                      <Check className="w-4 h-4" /> Funded!
                    </>
                  ) : state === 'processing' ? (
                    <>
                      <span className="animate-spin">⚡</span> Processing...
                    </>
                  ) : state === 'error' ? (
                    <>
                      <X className="w-4 h-4" /> Retry
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Auto-Fund ₱5K
                    </>
                  )}
                </button>

                <Link
                  href={`/clients/${candidate.id}`}
                  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium text-sm rounded-xl border border-zinc-600 transition-all"
                >
                  Profile →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {candidates.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          {expanded ? '▲ Show less' : `▼ Show ${candidates.length - 5} more`}
        </button>
      )}

      {/* Footer Info */}
      <p className="text-xs text-zinc-600 mt-4 text-center">
        Standard Micro-Loan: ₱5,000 Principal • 6% Interest • 1 Month • Total: ₱5,300
      </p>
    </div>
  );
}
