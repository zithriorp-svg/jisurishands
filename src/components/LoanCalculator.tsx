"use client";

import { useState, useEffect } from "react";
import { calculateOptimalDurationWithAI } from "@/app/review/actions";

interface AmortizationRow {
  period: number;
  paymentDate: Date;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

interface Agent {
  id: number;
  name: string;
  phone: string;
}

interface LoanCalculatorProps {
  applicationId: number;
  applicantName: string;
  suggestedPrincipal?: number;
  suggestedDuration?: number;
  suggestedTermType?: string;
  suggestedAgentId?: number | null;
  onDisburse: (loanData: LoanDisbursementData) => Promise<void>;
  onReject: () => Promise<void>;
  isProcessing: boolean;
  preselectedAgentId?: number | null;
}

export interface LoanDisbursementData {
  applicationId: number;
  principal: number;
  interestRate: number;
  termDuration: number;
  termType: "Days" | "Weeks" | "Months";
  totalInterest: number;
  totalRepayment: number;
  schedule: {
    periodNumber: number;
    paymentDate: Date;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    remainingBalance: number;
  }[];
  agentId?: number | null;
}

export default function LoanCalculator({
  applicationId,
  applicantName,
  suggestedPrincipal = 5000,
  suggestedDuration,
  suggestedTermType,
  suggestedAgentId,
  onDisburse,
  onReject,
  isProcessing,
  preselectedAgentId
}: LoanCalculatorProps) {
  const [principal, setPrincipal] = useState<number>(suggestedPrincipal);
  const [officialRate, setOfficialRate] = useState<number>(10);
  const [discountedRate, setDiscountedRate] = useState<number>(6);

  const [termDuration, setTermDuration] = useState<number>(suggestedDuration || 3);
  const [termType, setTermType] = useState<"Days" | "Weeks" | "Months">(
    (suggestedTermType as "Days" | "Weeks" | "Months") || "Months"
  );
  
  // 🚀 AI NEURAL LINK STATES
  const [isAIOptimizing, setIsAIOptimizing] = useState(false);

  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [calculated, setCalculated] = useState(false);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(suggestedAgentId || preselectedAgentId || null);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [vaultCash, setVaultCash] = useState<number | null>(null);
  const [loadingVaultCash, setLoadingVaultCash] = useState(true);

  // Fetch Agents
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/agents', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.agents) setAgents(data.agents);
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.error(e);
      })
      .finally(() => setLoadingAgents(false));
    return () => controller.abort();
  }, []);

  // Fetch Vault Cash
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vault-cash', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.vaultCash !== undefined) setVaultCash(data.vaultCash);
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.error(e);
      })
      .finally(() => setLoadingVaultCash(false));
    return () => controller.abort();
  }, []);

  // 🧠 GEMINI AI: AUTOMATIC DURATION OPTIMIZER
  // This triggers automatically whenever Principal or TermType changes.
  useEffect(() => {
    const triggerAIOptimization = async () => {
      // Don't trigger if principal is 0 or invalid
      if (principal <= 0) return; 

      setIsAIOptimizing(true);
      setCalculated(false);
      setShowSchedule(false);

      try {
        const response = await calculateOptimalDurationWithAI(principal, termType);
        if (response.success && response.duration) {
          // Snap the duration field to Gemini's optimal calculation
          setTermDuration(response.duration);
        } else {
          console.warn("AI Optimization skipped or failed:", response.error);
        }
      } catch (error) {
        console.error("Failed to connect to AI Engine:", error);
      } finally {
        setIsAIOptimizing(false);
      }
    };

    // Debounce the call slightly so it doesn't spam the API while you are typing the principal amount
    const timeoutId = setTimeout(() => {
      triggerAIOptimization();
    }, 800); 

    return () => clearTimeout(timeoutId);
  }, [principal, termType]); // 👈 Listens for changes in these two boxes


  const totalInterest = Number((principal * (discountedRate / 100)).toFixed(2));
  const totalRepayment = Number((principal + totalInterest).toFixed(2));

  const insufficientLiquidity = vaultCash !== null && principal > vaultCash;
  const liquidityDeficit = insufficientLiquidity ? principal - (vaultCash || 0) : 0;

  const calculateSchedule = () => {
    const newSchedule: AmortizationRow[] = [];
    const startDate = new Date();
    
    let remainingPrincipalToDistribute = principal;
    let remainingInterestToDistribute = totalInterest;
    
    for (let i = 1; i <= termDuration; i++) {
      const dueDate = new Date(startDate);
      
      switch (termType) {
        case "Days":
          dueDate.setDate(dueDate.getDate() + i);
          break;
        case "Weeks":
          dueDate.setDate(dueDate.getDate() + (i * 7));
          break;
        case "Months":
          dueDate.setMonth(dueDate.getMonth() + i);
          break;
      }
      
      const isLastPeriod = (i === termDuration);
      let strictPrincipal = 0;
      let strictInterest = 0;

      if (isLastPeriod) {
        strictPrincipal = Number(remainingPrincipalToDistribute.toFixed(2));
        strictInterest = Number(remainingInterestToDistribute.toFixed(2));
      } else {
        strictPrincipal = Number((principal / termDuration).toFixed(2));
        strictInterest = Number((totalInterest / termDuration).toFixed(2));
        
        remainingPrincipalToDistribute -= strictPrincipal;
        remainingInterestToDistribute -= strictInterest;
      }

      const strictTotalAmount = Number((strictPrincipal + strictInterest).toFixed(2));
      const remainingBalanceBeforeThisPayment = isLastPeriod 
        ? strictTotalAmount 
        : Number(((remainingPrincipalToDistribute + remainingInterestToDistribute) + strictTotalAmount).toFixed(2));
      const finalRemainingBalance = isLastPeriod ? 0 : Number((remainingBalanceBeforeThisPayment - strictTotalAmount).toFixed(2));
      
      newSchedule.push({
        period: i,
        paymentDate: dueDate,
        amount: strictTotalAmount,
        principalPortion: strictPrincipal,
        interestPortion: strictInterest,
        remainingBalance: finalRemainingBalance
      });
    }
    
    setSchedule(newSchedule);
    setShowSchedule(true);
    setCalculated(true);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDisburse = async () => {
    if (!calculated || schedule.length === 0) {
      alert("Please calculate the schedule first.");
      return;
    }

    const loanData: LoanDisbursementData = {
      applicationId,
      principal,
      interestRate: discountedRate, 
      termDuration,
      termType,
      totalInterest,
      totalRepayment,
      schedule: schedule.map(row => ({
        periodNumber: row.period,
        paymentDate: row.paymentDate,
        amount: row.amount,
        principalPortion: row.principalPortion,
        interestPortion: row.interestPortion,
        remainingBalance: row.remainingBalance
      })),
      agentId: selectedAgentId
    };

    await onDisburse(loanData);
  };

  const inputStyle = "w-full bg-[#1c1c21] border border-[#2a2a35] text-white font-bold p-3 rounded-xl outline-none focus:border-[#00df82] transition-colors";
  const labelStyle = "text-xs text-gray-500 font-bold uppercase tracking-widest";
  const displayPaymentPerPeriod = termDuration > 0 ? totalRepayment / termDuration : 0;

  return (
    <div className="bg-[#0f0f13] border border-[#00df82]/40 p-5 rounded-2xl space-y-5 shadow-[0_0_15px_rgba(0,223,130,0.05)] print:bg-white print:border-black print:shadow-none">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-[#00df82] font-bold uppercase tracking-widest text-sm">💰 Approve & Fund</h2>
        <span className="text-xs text-gray-500">For: {applicantName}</span>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-black">LOAN DISBURSEMENT</h1>
        <p className="text-sm text-gray-600">Borrower: {applicantName}</p>
        <p className="text-sm text-gray-600">Principal: ₱{principal.toLocaleString()} | Interest: {officialRate}% Official ({discountedRate}% Discounted Rate with Good Payer Discount)</p>
      </div>

      <div className="print:hidden">
        <label className={labelStyle}>Assigned Agent / Co-Maker (Optional)</label>
        <select
          value={selectedAgentId || ""}
          onChange={e => setSelectedAgentId(e.target.value ? Number(e.target.value) : null)}
          className={`${inputStyle} mt-2`}
          disabled={loadingAgents}
        >
          <option value="">No Agent Assigned</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name} {agent.phone ? `(${agent.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 print:hidden">
        <div className="col-span-2">
          <label className={labelStyle}>Principal Amount (₱)</label>
          <input
            type="number"
            value={principal}
            onChange={e => { setPrincipal(Number(e.target.value) || 0); }}
            className={`${inputStyle} mt-2 text-[#00df82] text-xl`}
            min="100"
          />
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-black/50 border border-[#2a2a35] rounded-xl">
          <div>
            <label className="text-[10px] text-red-400 font-black uppercase tracking-widest block mb-1">Official Rate (%)</label>
            <input 
              type="number" 
              value={officialRate} 
              onChange={e => { setOfficialRate(Number(e.target.value)); setCalculated(false); }}
              className="w-full bg-zinc-900 border border-red-900/40 rounded-lg p-2 text-red-400 font-mono" 
            />
          </div>
          <div>
            <label className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block mb-1">Discounted Rate (%)</label>
            <input 
              type="number" 
              value={discountedRate} 
              onChange={e => { setDiscountedRate(Number(e.target.value)); setCalculated(false); }}
              className="w-full bg-black border border-emerald-900/40 rounded-lg p-2 text-emerald-400 font-mono font-bold" 
            />
          </div>
          <p className="col-span-2 text-[10px] text-zinc-500 italic mt-1">
            * Logic: Official {officialRate}% vs Good Payer {discountedRate}% (-{Math.round(officialRate - discountedRate)}% Discount)
          </p>
        </div>

        <div>
          {/* 🚀 AI OPTIMIZATION UI NOTIFIER */}
          <div className="flex justify-between items-center">
             <label className={labelStyle}>Duration</label>
             {isAIOptimizing && <span className="text-[10px] text-cyan-400 font-black animate-pulse flex items-center gap-1">🧠 Optimizing...</span>}
          </div>
          <input
            type="number"
            value={termDuration}
            onChange={e => { setTermDuration(Number(e.target.value) || 1); setCalculated(false); setShowSchedule(false); }}
            className={`${inputStyle} mt-2 ${isAIOptimizing ? 'border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : ''}`}
            min="1"
          />
        </div>
        <div>
          <label className={labelStyle}>Term Type</label>
          <select
            value={termType}
            onChange={e => { setTermType(e.target.value as "Days" | "Weeks" | "Months"); }}
            className={`${inputStyle} mt-2`}
          >
            <option value="Days">Daily Payments</option>
            <option value="Weeks">Weekly Payments</option>
            <option value="Months">Monthly Payments</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-[#1c1c21] p-4 rounded-xl print:bg-gray-100 print:border print:border-black">
        <div className="text-center">
          <p className="text-xs text-gray-500 print:text-gray-600">Interest</p>
          <p className="text-lg font-bold text-yellow-500 print:text-black">{formatCurrency(totalInterest)}</p>
        </div>
        <div className="text-center border-x border-[#2a2a35] print:border-gray-300">
          <p className="text-xs text-gray-500 print:text-gray-600">Total</p>
          <p className="text-lg font-bold text-[#00df82] print:text-black">{formatCurrency(totalRepayment)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 print:text-gray-600">Per Period</p>
          <p className="text-lg font-bold text-white print:text-black">{formatCurrency(displayPaymentPerPeriod)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={calculateSchedule}
        disabled={isAIOptimizing}
        className="w-full bg-[#1c1c21] border-2 border-[#2a2a35] text-white py-3 font-bold text-sm uppercase tracking-widest rounded-xl hover:border-[#00df82] hover:text-[#00df82] transition-colors disabled:opacity-50 print:hidden"
      >
        {isAIOptimizing ? "🧠 AI Calculating..." : "📊 Calculate Schedule"}
      </button>

      {showSchedule && schedule.length > 0 && (
        <div className="border border-[#2a2a35] rounded-xl overflow-hidden print:border-black">
          <div className="flex justify-between items-center p-3 bg-[#1c1c21] print:bg-gray-100">
            <h4 className="font-bold text-white print:text-black text-xs">📅 FINAL AMORTIZATION SCHEDULE</h4>
            <button 
              type="button" 
              onClick={() => window.print()} 
              className="print:hidden bg-zinc-800 hover:bg-zinc-700 text-[10px] text-white py-1 px-3 rounded border border-zinc-600 transition-colors uppercase font-bold"
            >
              📄 Print / Save PDF
            </button>
          </div>
          <div className="bg-[#1c1c21] p-3 text-[10px] font-black text-gray-400 flex justify-between uppercase tracking-wider print:bg-gray-50 print:text-black print:border-b print:border-black">
            <span className="w-16">Period</span>
            <span className="w-24">Due Date</span>
            <span className="w-28 text-right">Payment</span>
            <span className="w-28 text-right">Balance</span>
          </div>
          <div className="max-h-48 overflow-y-auto print:max-h-none print:overflow-visible">
            {schedule.map((row) => (
              <div key={row.period} className="p-3 border-t border-[#2a2a35] flex justify-between text-xs bg-[#0f0f13] print:bg-white print:border-gray-300">
                <span className="w-16 text-gray-400 print:text-black">{row.period} {termType.slice(0, -1)}</span>
                <span className="w-24 text-gray-300 text-[10px] print:text-black font-mono">{formatDate(row.paymentDate)}</span>
                <span className="w-28 text-right text-[#00df82] font-black print:text-black">{formatCurrency(row.amount)}</span>
                <span className="w-28 text-right text-white print:text-black">{formatCurrency(row.remainingBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insufficientLiquidity && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 print:hidden">
          <p className="text-red-400 font-bold uppercase tracking-wider text-xs">⚠️ INSUFFICIENT VAULT LIQUIDITY</p>
          <p className="text-zinc-500 text-[10px] mt-1">Deficit: {formatCurrency(liquidityDeficit)}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2 print:hidden">
        <button
          type="button"
          onClick={handleDisburse}
          disabled={!calculated || isProcessing || insufficientLiquidity || isAIOptimizing}
          className="flex-1 bg-[#00df82] text-[#09090b] font-black py-4 rounded-xl hover:bg-[#00df82]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(0,223,130,0.2)]"
        >
          {isProcessing ? "Processing..." : insufficientLiquidity ? "⛔ NO FUNDS" : "✓ DISBURSE LOAN"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isProcessing}
          className="px-5 bg-red-500/10 text-red-500 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/20 disabled:opacity-50 transition-colors text-[10px] uppercase tracking-widest"
        >
          Drop
        </button>
      </div>
    </div>
  );
}
