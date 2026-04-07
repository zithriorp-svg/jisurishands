"use client";

import { useState, useEffect } from "react";
import { calculateOptimalDurationWithAI } from "@/app/review/actions"; 

interface Agent {
  id: number;
  name: string;
  phone: string;
}

interface DirectLoanCalculatorProps {
  clientId: number;
  clientName: string;
  onDisburseComplete?: () => void;
}

export default function DirectLoanCalculator({ clientId, clientName, onDisburseComplete }: DirectLoanCalculatorProps) {
  const [principal, setPrincipal] = useState<number>(5000);
  const [termType, setTermType] = useState<"Days" | "Weeks" | "Months">("Months");
  
  const [termDuration, setTermDuration] = useState<number>(3);
  const [isAIOptimizing, setIsAIOptimizing] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [vaultCash, setVaultCash] = useState<number | null>(null);

  const baseInterestRate = 0.10; 
  const discountRate = 0.04;     
  const effectiveRate = 0.06;    

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/agents', { signal: controller.signal })
      .then(res => res.json())
      .then(data => { if (data.agents) setAgents(data.agents); })
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
      .finally(() => setLoadingAgents(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vault-cash', { signal: controller.signal })
      .then(res => res.json())
      .then(data => { if (data.vaultCash !== undefined) setVaultCash(data.vaultCash); })
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
  }, []);

  // 🧠 GEMINI AI: LIVE DURATION OPTIMIZER
  useEffect(() => {
    const triggerAIOptimization = async () => {
      if (principal <= 0) {
        setTermDuration(0);
        return; 
      }
      setIsAIOptimizing(true);
      try {
        // 🚀 Passing 6% to match the effective rate of repeat clients!
        const response = await calculateOptimalDurationWithAI(principal, termType, 6);
        if (response.success && response.duration > 0) {
          setTermDuration(response.duration);
        } else {
           setTermDuration(1); // Failsafe
        }
      } catch (error) {
        console.error("AI Link Error:", error);
        setTermDuration(1); // Failsafe
      } finally {
        setIsAIOptimizing(false);
      }
    };
    const timeoutId = setTimeout(() => { triggerAIOptimization(); }, 800); 
    return () => clearTimeout(timeoutId);
  }, [principal, termType]);

  const baseInterest = principal * baseInterestRate;   
  const discountAmount = principal * discountRate;       
  const totalInterest = principal * effectiveRate;       
  const totalRepayment = principal + totalInterest;
  const paymentPerPeriod = termDuration > 0 ? totalRepayment / termDuration : 0;
  const insufficientLiquidity = vaultCash !== null && principal > vaultCash;
  const liquidityDeficit = insufficientLiquidity ? principal - (vaultCash || 0) : 0;

  const generateSchedule = () => {
    if (!principal || principal <= 0 || !termDuration) return [];
    
    const newSchedule = [];
    const startDate = new Date();
    const principalPerPeriod = principal / termDuration;
    const interestPerPeriod = totalInterest / termDuration;
    
    for (let i = 1; i <= termDuration; i++) {
      const dueDate = new Date(startDate);
      if (termType === "Days") dueDate.setDate(dueDate.getDate() + i);
      else if (termType === "Weeks") dueDate.setDate(dueDate.getDate() + (i * 7));
      else if (termType === "Months") dueDate.setMonth(dueDate.getMonth() + i);
      
      const remainingBalance = totalRepayment - (paymentPerPeriod * i);
      
      newSchedule.push({
        period: i,
        paymentDate: dueDate,
        dateStr: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: paymentPerPeriod,
        principalPortion: principalPerPeriod,
        interestPortion: interestPerPeriod,
        remainingBalance: Math.max(0, remainingBalance)
      });
    }
    return newSchedule;
  };

  const schedule = generateSchedule();

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDisburse = async () => {
    if (schedule.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/direct-disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId, principal, interestRate: 6, baseInterestRate: 10, discountRate: 4, 
          termDuration, termType, totalInterest, totalRepayment,
          schedule: schedule.map(row => ({
            periodNumber: row.period, paymentDate: row.paymentDate, amount: row.amount,
            principalPortion: row.principalPortion, interestPortion: row.interestPortion, remainingBalance: row.remainingBalance
          })),
          agentId: selectedAgentId
        })
      });

      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.message || "Loan disbursed successfully!");
        setPrincipal(5000);
        setSelectedAgentId(null);
        if (onDisburseComplete) onDisburseComplete();
      }
    } catch (err: any) {
      setError(err.message || "Failed to disburse loan");
    } finally {
      setIsProcessing(false);
    }
  };

  const inputStyle = "w-full bg-zinc-800 border border-zinc-700 text-white font-bold p-3 rounded-xl outline-none focus:border-emerald-500 transition-colors";
  const labelStyle = "text-xs text-zinc-500 font-bold uppercase tracking-widest";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h2 className="text-emerald-400 font-bold uppercase tracking-widest text-sm">💰 Issue New Loan (Repeat Client)</h2>
        <span className="text-xs text-zinc-500">Client: {clientName}</span>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-medium">⚠️ {error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm font-medium">✓ {success}</div>}

      <div>
        <label className={labelStyle}>Assigned Agent / Co-Maker (Optional)</label>
        <select value={selectedAgentId || ""} onChange={e => setSelectedAgentId(e.target.value ? Number(e.target.value) : null)} className={`${inputStyle} mt-2`} disabled={loadingAgents}>
          <option value="">No Agent Assigned</option>
          {agents.map(agent => ( <option key={agent.id} value={agent.id}>{agent.name} {agent.phone ? `(${agent.phone})` : ''}</option> ))}
        </select>
        {selectedAgentId && <p className="text-xs text-emerald-400 mt-1">✓ Agent will be assigned as Co-Maker for this loan</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelStyle}>Principal Amount (₱)</label>
          <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value) || 0)} className={`${inputStyle} mt-2 text-emerald-400 text-xl`} min="100" />
        </div>
        
        <div className="col-span-2 bg-zinc-800 p-4 rounded-xl border border-zinc-700">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-3">Interest Rate Structure</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-zinc-500">Official Rate</p><p className="text-lg font-bold text-white">10%</p></div>
            <div><p className="text-xs text-zinc-500">Discount</p><p className="text-lg font-bold text-emerald-400">-4%</p></div>
            <div><p className="text-xs text-zinc-500">Effective</p><p className="text-lg font-bold text-blue-400">6%</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-zinc-900 p-2 rounded flex justify-between"><span className="text-zinc-500">Base Interest:</span><span className="line-through text-red-400">₱{baseInterest.toFixed(2)}</span></div>
            <div className="bg-zinc-900 p-2 rounded flex justify-between"><span className="text-zinc-500">Discount:</span><span className="text-emerald-400">-₱{discountAmount.toFixed(2)}</span></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center">
             <label className={labelStyle}>Duration</label>
             {isAIOptimizing && <span className="text-[10px] text-cyan-400 font-black animate-pulse flex items-center gap-1">🧠 Optimizing...</span>}
          </div>
          <input type="number" value={termDuration} readOnly className={`${inputStyle} mt-2 opacity-70 cursor-not-allowed ${isAIOptimizing ? 'border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : ''}`} />
        </div>
        <div>
          <label className={labelStyle}>Term Type</label>
          <select value={termType} onChange={e => setTermType(e.target.value as "Days" | "Weeks" | "Months")} className={`${inputStyle} mt-2`}>
            <option value="Days">Daily Payments</option>
            <option value="Weeks">Weekly Payments</option>
            <option value="Months">Monthly Payments</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-zinc-800 p-4 rounded-xl">
        <div className="text-center"><p className="text-xs text-zinc-500 uppercase">Net Interest</p><p className="text-lg font-bold text-yellow-400">{formatCurrency(totalInterest)}</p><p className="text-xs text-emerald-400">w/ 4% discount</p></div>
        <div className="text-center border-x border-zinc-700"><p className="text-xs text-zinc-500 uppercase">Total</p><p className="text-lg font-bold text-emerald-400">{formatCurrency(totalRepayment)}</p></div>
        <div className="text-center"><p className="text-xs text-zinc-500 uppercase">Per Period</p><p className="text-lg font-bold text-white">{formatCurrency(paymentPerPeriod)}</p></div>
      </div>

      {isAIOptimizing ? (
        <div className="mt-4 p-4 border border-zinc-700 rounded-xl text-center bg-zinc-800">
          <span className="text-cyan-400 font-black animate-pulse flex items-center justify-center gap-2">🧠 AI GENERATING SCHEDULE...</span>
        </div>
      ) : schedule.length > 0 ? (
        <div className="border border-zinc-700 rounded-xl overflow-hidden mt-4">
          <div className="bg-zinc-800 p-3 flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span className="w-14">Period</span>
            <span className="w-24">Due Date</span>
            <span className="flex-1 text-right">Payment</span>
            <span className="flex-1 text-right">Balance</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {schedule.map((row) => (
              <div key={row.period} className="p-3 border-t border-zinc-800 flex justify-between text-sm bg-zinc-900 hover:bg-zinc-800 transition-colors">
                <span className="w-14 text-zinc-400 font-medium">{row.period} {termType === "Days" ? "D" : termType === "Weeks" ? "W" : "M"}</span>
                <span className="w-24 text-zinc-300 text-xs">{row.dateStr}</span>
                <span className="flex-1 text-right text-emerald-400 font-bold">{formatCurrency(row.amount)}</span>
                <span className="flex-1 text-right text-white font-medium">{formatCurrency(row.remainingBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 border border-zinc-700 rounded-xl text-center bg-zinc-800">
          <span className="text-zinc-500 font-bold text-xs uppercase">Enter principal to generate schedule</span>
        </div>
      )}

      {insufficientLiquidity && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-400 font-bold uppercase tracking-wider text-sm">INSUFFICIENT VAULT LIQUIDITY</p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-zinc-300">Required: <span className="text-red-400 font-bold">{formatCurrency(principal)}</span></p>
                <p className="text-zinc-300">Available: <span className="text-emerald-400 font-bold">{formatCurrency(vaultCash || 0)}</span></p>
                <p className="text-zinc-300">Deficit: <span className="text-red-400 font-bold">{formatCurrency(liquidityDeficit)}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleDisburse}
        disabled={schedule.length === 0 || isProcessing || insufficientLiquidity || isAIOptimizing}
        className="w-full bg-emerald-500 text-zinc-900 font-black py-4 rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-widest text-sm shadow-lg mt-4"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span>
            Processing...
          </span>
        ) : insufficientLiquidity ? "⛔ Insufficient Vault Funds" : "✓ Disburse Loan"}
      </button>
    </div>
  );
}
