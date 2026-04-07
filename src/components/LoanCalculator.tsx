"use client";

import { useState, useEffect } from "react";
import { calculateOptimalDurationWithAI } from "@/app/review/actions";

interface LoanCalculatorProps {
  appData: any;
  onDisburse: (loanData: any) => Promise<void>;
  onReject: () => Promise<void>;
  isProcessing: boolean;
  preselectedAgentId?: number | null;
}

export default function LoanCalculator({ appData, onDisburse, onReject, isProcessing, preselectedAgentId }: LoanCalculatorProps) {
  // 🚀 SYNC LINK: Loads exact client requests instantly!
  const [principal, setPrincipal] = useState<number>(appData.requestedPrincipal);
  const [termType, setTermType] = useState<string>(appData.requestedTermType);
  const [termDuration, setTermDuration] = useState<number>(appData.requestedDuration || 1);
  
  const [officialRate, setOfficialRate] = useState<number>(10);
  const [discountedRate, setDiscountedRate] = useState<number>(6);
  const [isAIOptimizing, setIsAIOptimizing] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(appData.requestedAgentId || preselectedAgentId || null);

  const [agents, setAgents] = useState<any[]>([]);
  const [vaultCash, setVaultCash] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/agents').then(res => res.json()).then(data => { if (data.agents) setAgents(data.agents); });
    fetch('/api/vault-cash').then(res => res.json()).then(data => { if (data.vaultCash !== undefined) setVaultCash(data.vaultCash); });
  }, []);

  // 🧠 LIVE AI DURATION OPTIMIZER
  useEffect(() => {
    const triggerAIOptimization = async () => {
      if (principal <= 0) return; 
      setIsAIOptimizing(true);
      try {
        const response = await calculateOptimalDurationWithAI(principal, termType, discountedRate);
        if (response.success && response.duration > 0) setTermDuration(response.duration);
      } catch (error) {
        console.error("AI Link Error");
      } finally {
        setIsAIOptimizing(false);
      }
    };
    const timeoutId = setTimeout(() => { triggerAIOptimization(); }, 800); 
    return () => clearTimeout(timeoutId);
  }, [principal, termType, discountedRate]); 

  const totalInterest = Number((principal * (discountedRate / 100)).toFixed(2));
  const totalRepayment = Number((principal + totalInterest).toFixed(2));
  const insufficientLiquidity = vaultCash !== null && principal > vaultCash;

  const generateSchedule = () => {
    if (!principal || principal <= 0 || !termDuration) return [];
    const newSchedule = [];
    const startDate = new Date();
    let remainingPrincipalToDistribute = principal;
    let remainingInterestToDistribute = totalInterest;
    
    for (let i = 1; i <= termDuration; i++) {
      const dueDate = new Date(startDate);
      if (termType === "Days") dueDate.setDate(dueDate.getDate() + i);
      else if (termType === "Weeks") dueDate.setDate(dueDate.getDate() + (i * 7));
      else if (termType === "Months") dueDate.setMonth(dueDate.getMonth() + i);
      
      const isLastPeriod = (i === termDuration);
      let strictPrincipal = isLastPeriod ? Number(remainingPrincipalToDistribute.toFixed(2)) : Number((principal / termDuration).toFixed(2));
      let strictInterest = isLastPeriod ? Number(remainingInterestToDistribute.toFixed(2)) : Number((totalInterest / termDuration).toFixed(2));
      
      if (!isLastPeriod) {
        remainingPrincipalToDistribute -= strictPrincipal;
        remainingInterestToDistribute -= strictInterest;
      }

      const strictTotalAmount = Number((strictPrincipal + strictInterest).toFixed(2));
      const remainingBalanceBeforeThisPayment = isLastPeriod ? strictTotalAmount : Number(((remainingPrincipalToDistribute + remainingInterestToDistribute) + strictTotalAmount).toFixed(2));
      const finalRemainingBalance = isLastPeriod ? 0 : Number((remainingBalanceBeforeThisPayment - strictTotalAmount).toFixed(2));
      
      newSchedule.push({ period: i, paymentDate: dueDate, dateStr: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), amount: strictTotalAmount, principalPortion: strictPrincipal, interestPortion: strictInterest, remainingBalance: finalRemainingBalance });
    }
    return newSchedule;
  };

  const schedule = generateSchedule();

  const handleDisburse = async () => {
    if (schedule.length === 0) return;
    const loanData = {
      applicationId: appData.id, principal, interestRate: discountedRate, 
      termDuration, termType, totalInterest, totalRepayment,
      schedule: schedule.map(row => ({ periodNumber: row.period, paymentDate: row.paymentDate, amount: row.amount, principalPortion: row.principalPortion, interestPortion: row.interestPortion, remainingBalance: row.remainingBalance })),
      agentId: selectedAgentId
    };
    await onDisburse(loanData);
  };

  const inputStyle = "w-full bg-[#1c1c21] border border-[#2a2a35] text-white font-bold p-3 rounded-xl outline-none focus:border-[#00df82] transition-colors";
  const labelStyle = "text-xs text-gray-500 font-bold uppercase tracking-widest";

  return (
    <div className="bg-[#0f0f13] border border-[#00df82]/40 p-5 rounded-2xl space-y-5 shadow-[0_0_15px_rgba(0,223,130,0.05)] print:bg-white print:border-none print:shadow-none print:p-0">
      
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-[#00df82] font-bold uppercase tracking-widest text-sm">💰 Approve & Fund</h2>
      </div>

      {/* ======================================= */}
      {/* 📄 THE MASTER PDF CONTRACT (PRINT ONLY) */}
      {/* ======================================= */}
      <div className="hidden print:block text-black bg-white font-sans mx-auto max-w-3xl">
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <h1 className="text-3xl font-bold uppercase tracking-wider">Master Loan Agreement</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Date: {new Date().toLocaleDateString()}</p>
        </div>

        <h2 className="font-bold text-lg border-b-2 border-gray-300 pb-1 mb-3 uppercase text-blue-900">1. Borrower Identity</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 pl-2">
          <div className="font-semibold text-gray-600">Full Name:</div><div className="font-bold">{appData.firstName} {appData.lastName}</div>
          <div className="font-semibold text-gray-600">Phone:</div><div className="font-bold">{appData.phone || '—'}</div>
          <div className="font-semibold text-gray-600">Address:</div><div className="font-bold">{appData.address || '—'}</div>
        </div>

        <h2 className="font-bold text-lg border-b-2 border-gray-300 pb-1 mb-3 uppercase text-green-900">2. Loan Disbursement Details</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 pl-2 bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="font-semibold text-green-800">Principal Amount:</div><div className="font-bold text-xl text-green-900">₱{principal.toLocaleString()}</div>
          <div className="font-semibold text-green-800">Official Interest Rate:</div><div className="font-bold">{officialRate}%</div>
          <div className="font-semibold text-green-800">Good Payer Discount:</div><div className="font-bold text-emerald-600">-{Math.round(officialRate - discountedRate)}% (Net: {discountedRate}%)</div>
          <div className="font-semibold text-green-800">Total Repayment:</div><div className="font-bold">₱{totalRepayment.toLocaleString()}</div>
          <div className="font-semibold text-green-800">Term Duration:</div><div className="font-bold">{termDuration} {termType}</div>
        </div>

        <h2 className="font-bold text-lg border-b-2 border-gray-300 pb-1 mb-3 uppercase text-blue-900">3. AI-Optimized Amortization Schedule</h2>
        <div className="border border-black mb-6">
          <div className="bg-gray-200 p-2 text-xs font-bold text-black flex justify-between uppercase border-b border-black">
            <span className="w-16">Period</span><span className="w-24">Due Date</span><span className="w-28 text-right">Payment</span><span className="w-28 text-right">Balance</span>
          </div>
          {schedule.map((row) => (
            <div key={row.period} className="p-2 border-b border-gray-300 flex justify-between text-sm text-black">
              <span className="w-16">{row.period} {termType.slice(0, -1)}</span><span className="w-24 text-xs">{row.dateStr}</span>
              <span className="w-28 text-right font-bold">₱{row.amount.toLocaleString()}</span><span className="w-28 text-right">₱{row.remainingBalance.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <h2 className="font-bold text-lg border-b-2 border-gray-300 pb-1 mb-3 uppercase text-purple-900">4. Pledged Collateral</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 pl-2 bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="font-semibold text-purple-800">Asset Type:</div><div className="font-bold">{appData.collateralName || '—'}</div>
          <div className="font-semibold text-purple-800">Market Value:</div><div className="font-bold text-rose-600">₱{(appData.collateralValue || 0).toLocaleString()}</div>
          <div className="font-semibold col-span-2 mt-2 text-purple-800">Specifications & Condition:</div><div className="col-span-2 font-medium italic text-gray-700">{appData.collateralCondition || '—'}</div>
        </div>

        <div style={{ pageBreakInside: 'avoid' }}>
          <h2 className="font-bold text-lg border-b-2 border-gray-300 pb-1 mb-3 uppercase text-rose-900 mt-6">5. Mga Tungkulin at Responsibilidad (Agreement)</h2>
          <div className="text-sm mb-6 pl-2 text-gray-800 space-y-4 leading-relaxed">
            <p className="font-bold uppercase">Bilang Nangutang, sumasang-ayon ako sa sumusunod:</p>
            <ul className="list-disc pl-5 space-y-2 font-medium text-black">
              <li><strong>INTERES AT DISCOUNT:</strong> Naiintindihan ko na ang opisyal na interes ay {officialRate}%. Mabibigyan lamang ako ng Good Payer Discount ({discountedRate}%) kung magbabayad ako ng buo at nasa oras. Kung ako ay ma-late, sisingilin ako ng buong {officialRate}%.</li>
              <li><strong>PAGHATAK NG KOLATERAL:</strong> Kung hindi ko mabayaran ang aking utang, kusang-loob kong isinusuko at binibigyan ng karapatan ang kumpanya na HATAKIN (Seize) ang idineklara kong kolateral upang ipambayad sa utang nang walang idinadaang proseso sa korte.</li>
              <li><strong>PENALTY AT LEGAL ACTION:</strong> Ang pagtatago o pagtakbo sa utang ay agarang sasampahan ng kaukulang kasong sibil o kriminal (Estafa o Theft) at irereport sa kinauukulan.</li>
            </ul>
          </div>
        </div>

        {appData.digitalSignature && (
          <div className="mt-8 pt-4 border-t-2 border-black print:break-inside-avoid">
            <h2 className="font-bold text-lg mb-2 uppercase">Digital Signature</h2>
            <div className="p-4 inline-block bg-gray-50 border-2 border-gray-300 rounded-lg">
              <img src={appData.digitalSignature} alt="Digital Signature" style={{ maxHeight: '100px', filter: 'invert(1) contrast(200%)' }} />
            </div>
            <p className="text-xs text-gray-500 mt-2 font-bold uppercase">Signatory: {appData.firstName} {appData.lastName}</p>
          </div>
        )}
      </div>
      {/* ======================================= */}


      <div className="grid grid-cols-2 gap-4 print:hidden">
        <div className="col-span-2">
          <label className={labelStyle}>Principal Amount (₱)</label>
          <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value) || 0)} className={`${inputStyle} mt-2 text-[#00df82] text-xl`} min="100" />
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-black/50 border border-[#2a2a35] rounded-xl">
          <div>
            <label className="text-[10px] text-red-400 font-black uppercase tracking-widest block mb-1">Official Rate (%)</label>
            <input type="number" value={officialRate} onChange={e => setOfficialRate(Number(e.target.value))} className="w-full bg-zinc-900 border border-red-900/40 rounded-lg p-2 text-red-400 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block mb-1">Discounted Rate (%)</label>
            <input type="number" value={discountedRate} onChange={e => setDiscountedRate(Number(e.target.value))} className="w-full bg-black border border-emerald-900/40 rounded-lg p-2 text-emerald-400 font-mono font-bold" />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center">
             <label className={labelStyle}>Duration</label>
             {isAIOptimizing && <span className="text-[10px] text-cyan-400 font-black animate-pulse flex items-center gap-1">🧠 Optimizing...</span>}
          </div>
          <input type="number" value={termDuration} readOnly className={`${inputStyle} mt-2 opacity-70 cursor-not-allowed`} />
        </div>
        <div>
          <label className={labelStyle}>Term Type</label>
          <select value={termType} onChange={e => setTermType(e.target.value as "Days" | "Weeks" | "Months")} className={`${inputStyle} mt-2`}>
            <option value="Days">Daily Payments</option><option value="Weeks">Weekly Payments</option><option value="Months">Monthly Payments</option>
          </select>
        </div>
      </div>

      {isAIOptimizing ? (
        <div className="mt-4 p-4 border border-[#2a2a35] rounded-xl text-center bg-[#1c1c21] print:hidden">
          <span className="text-cyan-400 font-black animate-pulse flex items-center justify-center gap-2">🧠 AI GENERATING SCHEDULE...</span>
        </div>
      ) : schedule.length > 0 ? (
        <div className="border border-[#2a2a35] rounded-xl overflow-hidden mt-4 print:hidden">
          <div className="flex justify-between items-center p-3 bg-[#1c1c21]">
            <h4 className="font-bold text-white text-xs">📅 FINAL AMORTIZATION SCHEDULE</h4>
            <button type="button" onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-[10px] text-white py-1 px-3 rounded border border-zinc-600 transition-colors uppercase font-bold shadow-lg">📄 Print / Save PDF Contract</button>
          </div>
          <div className="bg-[#1c1c21] p-3 text-[10px] font-black text-gray-400 flex justify-between uppercase tracking-wider border-b border-[#2a2a35]">
            <span className="w-16">Period</span><span className="w-24">Due Date</span><span className="w-28 text-right">Payment</span><span className="w-28 text-right">Balance</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {schedule.map((row) => (
              <div key={row.period} className="p-3 border-t border-[#2a2a35] flex justify-between text-xs bg-[#0f0f13]">
                <span className="w-16 text-gray-400">{row.period} {termType.slice(0, -1)}</span><span className="w-24 text-gray-300 text-[10px]">{row.dateStr}</span>
                <span className="w-28 text-right text-[#00df82] font-bold">₱{row.amount.toLocaleString()}</span><span className="w-28 text-right text-white">₱{row.remainingBalance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {insufficientLiquidity && <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 print:hidden"><p className="text-red-400 font-bold uppercase tracking-wider text-xs">⚠️ INSUFFICIENT VAULT LIQUIDITY</p></div>}

      <div className="flex gap-3 pt-2 print:hidden">
        <button onClick={handleDisburse} disabled={schedule.length === 0 || isProcessing || insufficientLiquidity || isAIOptimizing} className="flex-1 bg-[#00df82] text-[#09090b] font-black py-4 rounded-xl hover:bg-[#00df82]/80 disabled:opacity-50 uppercase text-xs">
          {isProcessing ? "Processing..." : insufficientLiquidity ? "⛔ NO FUNDS" : "✓ DISBURSE LOAN"}
        </button>
        <button onClick={onReject} disabled={isProcessing} className="px-5 bg-red-500/10 text-red-500 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/20 disabled:opacity-50 text-[10px] uppercase">Drop</button>
      </div>
    </div>
  );
}
