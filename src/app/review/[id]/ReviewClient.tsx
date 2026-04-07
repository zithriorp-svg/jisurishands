"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoanCalculator, { LoanDisbursementData } from "@/components/LoanCalculator";
import { disburseLoan, rejectApplication } from "../actions";

interface ReviewClientProps {
  appData: any;
}

export default function ReviewClient({ appData }: ReviewClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preselectedAgentId, setPreselectedAgentId] = useState<number | null>(null);

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
      router.push("/?disbursed=true");
    } catch (err: any) {
      setError(err.message || "Failed to disburse loan");
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this application?")) return;
    setIsProcessing(true);
    try {
      await rejectApplication(appData.id);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <>
      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold print:hidden">⚠️ {error}</div>}
      <LoanCalculator
        appData={appData}
        onDisburse={handleDisburse}
        onReject={handleReject}
        isProcessing={isProcessing}
        preselectedAgentId={preselectedAgentId}
      />
    </>
  );
}
