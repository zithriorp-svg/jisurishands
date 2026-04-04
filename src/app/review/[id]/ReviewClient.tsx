"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoanCalculator, { LoanDisbursementData } from "@/components/LoanCalculator";
import { disburseLoan, rejectApplication } from "../actions";

interface ReviewClientProps {
  applicationId: number;
  applicantName: string;
  suggestedIncome: number;
  referenceName: string | null;
  referencePhone: string | null;
  // Requested Loan Configuration (for seamless disbursement)
  requestedPrincipal?: number | null;
  requestedDuration?: number | null;
  requestedTermType?: string | null;
  requestedAgentId?: number | null;
}

export default function ReviewClient({ 
  applicationId, 
  applicantName, 
  suggestedIncome,
  referenceName,
  referencePhone,
  requestedPrincipal,
  requestedDuration,
  requestedTermType,
  requestedAgentId
}: ReviewClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preselectedAgentId, setPreselectedAgentId] = useState<number | null>(null);
  const [registeringAgent, setRegisteringAgent] = useState(false);

  const handleRegisterReferenceAsAgent = async () => {
    if (!referenceName?.trim()) {
      alert("No reference name available to register as agent");
      return;
    }

    setRegisteringAgent(true);
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: referenceName,
          phone: referencePhone || "",
          applicationId
        })
      });

      const data = await res.json();
      
      if (data.success && data.agent) {
        setPreselectedAgentId(data.agent.id);
        alert(`✓ ${data.message || 'Agent registered successfully'}\n\n${data.agent.name} is now pre-selected as the Co-Maker for this loan.`);
      } else {
        alert(data.error || "Failed to register agent");
      }
    } catch (e: any) {
      alert(e.message || "Failed to register agent");
    } finally {
      setRegisteringAgent(false);
    }
  };

  const handleDisburse = async (loanData: LoanDisbursementData) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await disburseLoan(loanData);
      
      if (result.error) {
        setError(result.error);
        setIsProcessing(false);
        return;
      }
      
      // Success - redirect to dashboard
      router.push("/?disbursed=true");
    } catch (err: any) {
      setError(err.message || "Failed to disburse loan");
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this application?")) {
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await rejectApplication(applicationId);
      
      if (result.error) {
        setError(result.error);
        setIsProcessing(false);
        return;
      }
      
      // Success - redirect to dashboard
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to reject application");
      setIsProcessing(false);
    }
  };

  return (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold">
          ⚠️ Error: {error}
        </div>
      )}
      
      {/* Register Reference as Agent Button */}
      {referenceName && (
        <div className="mb-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Reference-to-Agent Pipeline</p>
              <p className="text-white font-bold mt-1">
                {referenceName} {referencePhone && `(${referencePhone})`}
              </p>
            </div>
            {preselectedAgentId ? (
              <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl font-bold text-sm">
                ✓ Pre-selected as Co-Maker
              </div>
            ) : (
              <button
                onClick={handleRegisterReferenceAsAgent}
                disabled={registeringAgent}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm uppercase tracking-wider flex items-center gap-2"
              >
                {registeringAgent ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Registering...
                  </>
                ) : (
                  <>
                    ➕ Register as Field Agent
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
      
      <LoanCalculator
        applicationId={applicationId}
        applicantName={applicantName}
        suggestedPrincipal={requestedPrincipal || Math.min(suggestedIncome * 0.5, 50000)}
        suggestedDuration={requestedDuration || undefined}
        suggestedTermType={requestedTermType || undefined}
        suggestedAgentId={requestedAgentId || preselectedAgentId}
        onDisburse={handleDisburse}
        onReject={handleReject}
        isProcessing={isProcessing}
        preselectedAgentId={preselectedAgentId}
      />
    </>
  );
}
