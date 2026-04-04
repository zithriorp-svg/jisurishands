"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DelinquencyAlerts from "@/components/DelinquencyAlerts";
import QuickActionsGrid from "@/components/QuickActionsGrid";
// 🚀 IMPORTING THE MASTER ADMIN LOGOUT PROTOCOL
import LockVaultButton from "@/components/LockVaultButton"; 

interface AgentData {
  id: number; name: string; phone: string; username?: string | null; createdAt: Date;
  activeClients: any[]; totalRiskLiability: number; pendingCommission: number;
  totalLifetimeEarnings: number; totalCollected: number; commissionsCount: number;
  overdueCount: number; onTrackCount: number; totalActiveLoans: number;
}

const formatCurrency = (value: number | null) => `₱${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AgentPortalClient({ agent, alerts, portfolios }: { agent: AgentData, alerts?: any, portfolios?: any[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-400 font-mono text-xs uppercase tracking-widest">Booting Tactical HUD...</p>
      </div>
    );
  }

  // 📊 CALCULATING PORTFOLIO HEALTH SAFELY
  let paidCount = 0; let partialCount = 0; let pendingCount = 0; let lateCount = 0;
  if (agent && agent.activeClients) {
      agent.activeClients.forEach(client => {
        if (client.loan && client.loan.installments) {
            client.loan.installments.forEach((inst: any) => {
              const isLate = new Date(inst.dueDate) < new Date() && inst.status === "PENDING";
              if (inst.status === "PAID") paidCount++;
              else if (inst.status === "PARTIAL") partialCount++;
              else if (isLate) lateCount++;
              else pendingCount++;
            });
        }
      });
  }

  const totalInst = paidCount + partialCount + pendingCount + lateCount;
  const latePct = totalInst > 0 ? (lateCount / totalInst) * 100 : 0;
  const paidPct = totalInst > 0 ? (paidCount / totalInst) * 100 : 0;
  const partialPct = totalInst > 0 ? (partialCount / totalInst) * 100 : 0;

  // 📊 CASH FLOW VELOCITY MATRIX DATA SAFELY
  const riskLiability = agent?.totalRiskLiability || 0;
  const totalCollected = agent?.totalCollected || 0;
  
  const chartData = [
    { week: 'W1', capitalOut: riskLiability * 0.1, capitalIn: totalCollected * 0.05 },
    { week: 'W3', capitalOut: riskLiability * 0.3, capitalIn: totalCollected * 0.2 },
    { week: 'W5', capitalOut: riskLiability * 0.5, capitalIn: totalCollected * 0.4 },
    { week: 'W7', capitalOut: riskLiability * 0.7, capitalIn: totalCollected * 0.6 },
    { week: 'W9', capitalOut: riskLiability * 0.9, capitalIn: totalCollected * 0.8 },
    { week: 'W12', capitalOut: riskLiability, capitalIn: totalCollected }
  ];
  
  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.capitalOut, d.capitalIn)), 1000);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20 font-sans">
      
      {/* SECURITY HEADER */}
      <div className="flex justify-between items-center pt-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-900/50 border border-emerald-500/50 rounded-xl flex items-center justify-center text-xl">🛡️</div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-widest leading-none">Agent HUD</h1>
            <p className="text-[10px] text-emerald-400 font-mono tracking-widest mt-1">SECURE UPLINK ESTABLISHED</p>
          </div>
        </div>
        
        {/* 🚀 THE MASTER LOCK BUTTON DEPLOYED FOR AGENTS */}
        <LockVaultButton />

      </div>

      {/* AGENT IDENTITY STRIP */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-5 shadow-2xl flex justify-between items-center relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
        <div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Operative Identity</p>
          <p className="text-2xl font-black text-white uppercase tracking-wide">{agent?.name || "FIELD AGENT"}</p>
        </div>
        <div className="text-right">
           <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Clearance Level</p>
           <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/30">LEVEL 2 : FIELD AGENT</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* NATIVE CHART: CASH FLOW VELOCITY MATRIX */}
        <div className="md:col-span-2 bg-black border border-[#00ff00]/30 rounded-2xl p-6 shadow-xl">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-[#00ff00] uppercase tracking-widest flex items-center gap-2">
                <span className="animate-pulse">●</span> Cash Flow Velocity
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-1 rounded">90-DAY MATRIX</span>
           </div>
           
           <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4">
                 <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mb-1">Capital Deployed</p>
                 <p className="text-xl md:text-2xl font-black text-rose-500">{formatCurrency(riskLiability)}</p>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4">
                 <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Capital Recovered</p>
                 <p className="text-xl md:text-2xl font-black text-emerald-500">{formatCurrency(totalCollected)}</p>
              </div>
           </div>

           <div className="h-48 w-full flex items-end justify-between gap-1 md:gap-2 border-b border-zinc-800 pb-2 relative mt-12">
              {chartData.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 bg-zinc-800 border border-zinc-700 text-white text-[10px] p-2 rounded-lg pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-xl">
                    <p className="text-[#00ff00] font-bold">IN: {formatCurrency(d.capitalIn)}</p>
                    <p className="text-[#00bcd4] font-bold">OUT: {formatCurrency(d.capitalOut)}</p>
                  </div>
                  <div className="flex items-end justify-center gap-0.5 md:gap-1 w-full h-full">
                    <div className="w-1/3 max-w-[16px] bg-gradient-to-t from-[#00bcd4] to-[#008ba3] rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((d.capitalOut / maxChartValue) * 100, 2)}%` }}></div>
                    <div className="w-1/3 max-w-[16px] bg-gradient-to-t from-[#00ff00] to-[#009900] rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((d.capitalIn / maxChartValue) * 100, 2)}%` }}></div>
                  </div>
                  <span className="text-[9px] md:text-[10px] font-mono text-zinc-500 mt-2">{d.week}</span>
                </div>
              ))}
           </div>
           <div className="flex justify-center gap-6 mt-4">
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#00ff00] rounded-sm"></div><span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">◆ CAPITAL IN</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#00bcd4] rounded-sm"></div><span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">◆ CAPITAL OUT</span></div>
           </div>
        </div>

        {/* NATIVE CHART: PORTFOLIO HEALTH (DONUT) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl md:col-span-2">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-8">
            Micro-Portfolio Health (Installments)
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            
            <div className="relative w-48 h-48 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" style={{
                background: `conic-gradient(
                  #f43f5e 0% ${latePct}%,
                  #10b981 ${latePct}% ${latePct + paidPct}%,
                  #38bdf8 ${latePct + paidPct}% ${latePct + paidPct + partialPct}%,
                  #eab308 ${latePct + paidPct + partialPct}% 100%
                )`
              }}>
              <div className="absolute inset-4 bg-zinc-900 rounded-full flex flex-col items-center justify-center border border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <span className="text-3xl font-black text-white">{totalInst}</span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest">TOTAL</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between w-32 border-b border-zinc-800 pb-2">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div><span className="text-xs text-zinc-400">Late</span></div>
                 <span className="font-mono text-xs font-bold text-rose-400">{lateCount}</span>
               </div>
               <div className="flex items-center justify-between w-32 border-b border-zinc-800 pb-2">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div><span className="text-xs text-zinc-400">Paid</span></div>
                 <span className="font-mono text-xs font-bold text-emerald-400">{paidCount}</span>
               </div>
               <div className="flex items-center justify-between w-32 border-b border-zinc-800 pb-2">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-sky-400 rounded-sm"></div><span className="text-xs text-zinc-400">Partial</span></div>
                 <span className="font-mono text-xs font-bold text-sky-400">{partialCount}</span>
               </div>
               <div className="flex items-center justify-between w-32">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div><span className="text-xs text-zinc-400">Pending</span></div>
                 <span className="font-mono text-xs font-bold text-yellow-400">{pendingCount}</span>
               </div>
            </div>

          </div>
        </div>

      </div>

      {/* COMMISSION FORECASTER */}
      <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
        <div className="absolute -right-10 -top-10 text-9xl opacity-5">💰</div>
        <h2 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4">Commission Forecaster (40% Cut)</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Unlocked Payout</p>
            <p className="text-3xl md:text-4xl font-black text-amber-500">{formatCurrency(agent?.pendingCommission || 0)}</p>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-2 font-medium">Ready for immediate withdrawal</p>
          </div>
          <div>
             <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Projected Week Pipeline</p>
             <p className="text-xl md:text-2xl font-black text-emerald-500">+{formatCurrency(riskLiability * 0.05 * 0.40)}</p>
             <p className="text-[10px] md:text-xs text-zinc-500 mt-2 font-medium">If all clients pay on time</p>
          </div>
        </div>
      </div>

      {/* THE FUSION: Classic Proactive HUD and Quick Actions */}
      <DelinquencyAlerts overdue={alerts?.overdue || []} dueToday={alerts?.dueToday || []} upcoming={alerts?.upcoming || []} />
      <QuickActionsGrid isAdmin={false} portfolios={portfolios || []} />

    </div>
  );
}
