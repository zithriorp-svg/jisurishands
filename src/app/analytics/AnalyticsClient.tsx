"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ComposedChart, Line, Sankey, Layer
} from "recharts";

interface AnalyticsData {
  portfolio: string;
  liquidityData: Array<{ date: string; balance: number; inflows: number; outflows: number; }>;
  cashFlowData: Array<{ name: string; value: number; type: string; }>;
  portfolioHealthData: Array<{ name: string; value: number; amount: number; color: string; }>;
  velocityData: Array<{ month: string; lent: number; collected: number; interest: number; }>;
  cashFlowVelocityData: Array<{ week: string; capitalOut: number; capitalIn: number; }>;
  summary: {
    currentVaultCash: number; outstandingPrincipal: number; totalDeposits: number;
    totalWithdrawals: number; totalDisbursed: number; totalCollected: number;
    totalInterestCollected: number; totalExpenseAmount: number; activeLoans: number;
    totalClients: number; avgLoanSize: number;
  };
  enterpriseKPIs: {
    capitalUtilizationRatio: number; costToIncomeRatio: number; portfolioAtRisk: number;
    activeDisbursedPrincipal: number; loansAtRiskCount: number;
  };
  rciMetrics: {
    netInterestMargin: number; atRiskCapital: number; penaltyRevenue: number; lateInstallmentsCount: number;
  };
}

// 🚀 CRITICAL FIX: Restored exact 2-decimal precision. No more phantom rounding!
const formatCurrency = (value: number) => {
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CHART_HEIGHT = 300;

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/analytics', { signal: controller.signal })
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Initializing analytics terminal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 flex items-center justify-center">
        <div className="text-center"><p className="text-red-400 text-xl mb-2">Terminal Error</p><p className="text-zinc-500">{error || 'Unknown error'}</p></div>
      </div>
    );
  }

  const { liquidityData, cashFlowData, portfolioHealthData, velocityData, cashFlowVelocityData, summary, enterpriseKPIs, rciMetrics } = data;

  const hasLiquidityData = liquidityData && liquidityData.length > 0;
  const hasCashFlowData = cashFlowData && cashFlowData.length > 0;
  const hasHealthData = portfolioHealthData && portfolioHealthData.length > 0;
  const hasVelocityData = velocityData && velocityData.length > 0;
  const hasCashFlowVelocityData = cashFlowVelocityData && cashFlowVelocityData.length > 0;

  // ============================================================================
  // 🚀 DYNAMIC SANKEY ENGINE (HIGH PRECISION MODE)
  // Removed Math.round() to prevent ghost external inflows.
  // ============================================================================
  const tDep = Number((summary.totalDeposits || 0).toFixed(2));
  const tInt = Number((summary.totalInterestCollected || 0).toFixed(2));
  const tCash = Number((summary.currentVaultCash || 0).toFixed(2));
  const tOuts = Number((summary.outstandingPrincipal || 0).toFixed(2));
  const tExp = Number((summary.totalExpenseAmount || 0).toFixed(2));
  const tWith = Number((summary.totalWithdrawals || 0).toFixed(2));
  const totalFunds = Number((tDep + tInt).toFixed(2));

  let sankeyNodes: any[] = [];
  let sankeyLinks: any[] = [];
  let nodeIndex = 0;

  const addSankeyNode = (name: string) => {
    sankeyNodes.push({ name });
    return nodeIndex++;
  };

  if (totalFunds > 0) {
    const idxTotal = addSankeyNode("Total Vault Funds");
    
    if (tDep > 0) {
      const idxDep = addSankeyNode("Capital Deposits");
      sankeyLinks.push({ source: idxDep, target: idxTotal, value: tDep });
    }
    if (tInt > 0) {
      const idxInt = addSankeyNode("Interest Income");
      sankeyLinks.push({ source: idxInt, target: idxTotal, value: tInt });
    }

    if (tCash > 0) {
      const idxCash = addSankeyNode("Vault Cash (Idle)");
      sankeyLinks.push({ source: idxTotal, target: idxCash, value: tCash });
    }
    if (tOuts > 0) {
      const idxLoans = addSankeyNode("Active Loans (Working)");
      sankeyLinks.push({ source: idxTotal, target: idxLoans, value: tOuts });
    }
    if (tExp > 0) {
      const idxExp = addSankeyNode("Operating Expenses");
      sankeyLinks.push({ source: idxTotal, target: idxExp, value: tExp });
    }
    if (tWith > 0) {
      const idxWith = addSankeyNode("Owner Withdrawals");
      sankeyLinks.push({ source: idxTotal, target: idxWith, value: tWith });
    }
    
    const totalIn = Number((tDep + tInt).toFixed(2));
    const totalOut = Number((tCash + tOuts + tExp + tWith).toFixed(2));
    
    // Tolerate tiny fractional differences to prevent UI bugs
    if (totalIn > totalOut && (totalIn - totalOut) > 0.01) {
       const idxUnacc = addSankeyNode("Unallocated / Reserve");
       sankeyLinks.push({ source: idxTotal, target: idxUnacc, value: Number((totalIn - totalOut).toFixed(2)) });
    } else if (totalOut > totalIn && (totalOut - totalIn) > 0.01) {
       const idxGhost = addSankeyNode("External Inflow");
       sankeyLinks.push({ source: idxGhost, target: idxTotal, value: Number((totalOut - totalIn).toFixed(2)) });
    }
  }
  const sankeyData = { nodes: sankeyNodes, links: sankeyLinks };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Analytics Control Panel</h1>
        <p className="text-sm text-zinc-500 mt-1">Portfolio: <span className="text-yellow-400">{data.portfolio}</span></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vault Cash</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-400">{formatCurrency(summary.currentVaultCash)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-xl md:text-2xl font-bold text-blue-400">{formatCurrency(summary.outstandingPrincipal)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Interest Income</p>
          <p className="text-xl md:text-2xl font-bold text-[#00df82]">{formatCurrency(summary.totalInterestCollected)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active Loans</p>
          <p className="text-xl md:text-2xl font-bold text-amber-400">{summary.activeLoans}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2"><span>📊</span> Enterprise KPI Board</h2>
          <span className="text-xs text-zinc-500 font-mono">O1A MODULE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Capital Utilization Ratio</p>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${enterpriseKPIs.capitalUtilizationRatio >= 80 && enterpriseKPIs.capitalUtilizationRatio <= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : enterpriseKPIs.capitalUtilizationRatio > 90 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-600/20 text-zinc-400 border border-zinc-600/30'}`}>
                {enterpriseKPIs.capitalUtilizationRatio >= 80 && enterpriseKPIs.capitalUtilizationRatio <= 90 ? 'OPTIMAL' : enterpriseKPIs.capitalUtilizationRatio > 90 ? 'HIGH' : 'LOW'}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{enterpriseKPIs.capitalUtilizationRatio.toFixed(1)}%</p>
            <p className="text-xs text-zinc-500 mt-2">Active Disbursed: {formatCurrency(enterpriseKPIs.activeDisbursedPrincipal)}</p>
            <div className="mt-3 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${enterpriseKPIs.capitalUtilizationRatio >= 80 && enterpriseKPIs.capitalUtilizationRatio <= 90 ? 'bg-emerald-500' : enterpriseKPIs.capitalUtilizationRatio > 90 ? 'bg-amber-500' : 'bg-zinc-500'}`} style={{ width: `${Math.min(enterpriseKPIs.capitalUtilizationRatio, 100)}%` }} />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Target: 80-90%</p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Cost-to-Income Ratio</p>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${enterpriseKPIs.costToIncomeRatio < 100 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : enterpriseKPIs.costToIncomeRatio === 0 ? 'bg-zinc-600/20 text-zinc-400 border border-zinc-600/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {enterpriseKPIs.costToIncomeRatio === 0 ? 'NO DATA' : enterpriseKPIs.costToIncomeRatio < 100 ? 'PROFITABLE' : 'LOSS'}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{enterpriseKPIs.costToIncomeRatio.toFixed(1)}%</p>
            <p className="text-xs text-zinc-500 mt-2">Expenses: {formatCurrency(summary.totalExpenseAmount)} / Interest: {formatCurrency(summary.totalInterestCollected)}</p>
            <div className="mt-3 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${enterpriseKPIs.costToIncomeRatio < 100 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(enterpriseKPIs.costToIncomeRatio, 100)}%` }} />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Target: &lt;100% (Profitable)</p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Portfolio at Risk (PAR)</p>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${enterpriseKPIs.portfolioAtRisk === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : enterpriseKPIs.loansAtRiskCount <= 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {enterpriseKPIs.portfolioAtRisk === 0 ? 'SAFE' : enterpriseKPIs.loansAtRiskCount <= 2 ? 'WATCH' : 'ALERT'}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(enterpriseKPIs.portfolioAtRisk)}</p>
            <p className="text-xs text-zinc-500 mt-2">{enterpriseKPIs.loansAtRiskCount} loan(s) with late installments</p>
            <div className="mt-3 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${enterpriseKPIs.portfolioAtRisk === 0 ? 'bg-emerald-500' : enterpriseKPIs.loansAtRiskCount <= 2 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${summary.outstandingPrincipal > 0 ? Math.min((enterpriseKPIs.portfolioAtRisk / summary.outstandingPrincipal) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Catastrophic risk exposure</p>
          </div>
        </div>
      </div>

      {/* 🚀 THE NEW SANKEY CHART: High Precision Mode */}
      <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2"><span>🌊</span> Macro Money Flow (The Every-Peso Map)</h2>
          <span className="text-xs text-zinc-500 font-mono">SANKEY MODULE</span>
        </div>
        <div style={{ width: '100%', height: 400 }}>
          {totalFunds > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                nodePadding={40}
                margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
                link={{ stroke: '#00df82', strokeOpacity: 0.2 }}
                node={({ x, y, width, height, index, payload }: any) => {
                  const isLeft = ['Capital Deposits', 'Interest Income', 'External Inflow'].includes(payload.name);
                  const isCenter = payload.name === 'Total Vault Funds';
                  const fill = payload.name === 'Operating Expenses' ? '#fb7185' : payload.name === 'Owner Withdrawals' ? '#f43f5e' : payload.name === 'Active Loans (Working)' ? '#fbbf24' : payload.name === 'Total Vault Funds' ? '#60a5fa' : '#34d399';

                  return (
                    <Layer key={`CustomNode${index}`}>
                      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#09090b" strokeWidth={2} rx={2} />
                      <text x={isLeft ? x - 15 : isCenter ? x + width / 2 : x + width + 15} y={isCenter ? y - 15 : y + height / 2} dy={isCenter ? 0 : 4} textAnchor={isLeft ? 'end' : isCenter ? 'middle' : 'start'} fill="#d4d4d8" fontSize={12} className="font-mono font-bold uppercase tracking-wider">{payload.name}</text>
                      <text x={isLeft ? x - 15 : isCenter ? x + width / 2 : x + width + 15} y={isCenter ? y - 30 : y + height / 2 + 18} textAnchor={isLeft ? 'end' : isCenter ? 'middle' : 'start'} fill={fill} fontSize={14} className="font-black">{formatCurrency(payload.value)}</text>
                    </Layer>
                  );
                }}
              >
                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#00df82', fontWeight: 'bold' }} formatter={(value: number) => formatCurrency(value)} />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">Awaiting capital inflows to map the money river...</div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl p-6 shadow-xl mb-6 border ${rciMetrics.netInterestMargin >= 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/50'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><span>🎯</span><span className={rciMetrics.netInterestMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}>NIM Breakeven Target</span></h2>
          <span className="text-xs text-zinc-500 font-mono">PROFITABILITY PROTOCOL</span>
        </div>

        {rciMetrics.netInterestMargin >= 0 ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-4xl">✅</span><span className="text-3xl font-bold text-emerald-400">PROFITABLE NIM: +{formatCurrency(rciMetrics.netInterestMargin)}</span>
            </div>
            <p className="text-zinc-400 text-sm">Interest income exceeds operating expenses by {formatCurrency(rciMetrics.netInterestMargin)}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"><p className="text-xs text-zinc-500 uppercase">Interest Collected</p><p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.totalInterestCollected)}</p></div>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"><p className="text-xs text-zinc-500 uppercase">Operating Expenses</p><p className="text-xl font-bold text-rose-400">{formatCurrency(summary.totalExpenseAmount)}</p></div>
            </div>
          </div>
        ) : (
          (() => {
            const deficit = Math.abs(rciMetrics.netInterestMargin);
            const standardLoanPrincipal = 5000;
            const standardInterestRate = 0.10; 
            const interestPerLoan = standardLoanPrincipal * standardInterestRate;
            const loansNeeded = Math.ceil(deficit / interestPerLoan);

            return (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-3 mb-3"><span className="text-4xl animate-pulse">🚨</span><span className="text-2xl md:text-3xl font-bold text-rose-400">OPERATIONAL DEFICIT: {formatCurrency(deficit)}</span></div>
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-4 max-w-xl mx-auto">
                  <p className="text-rose-300 font-medium text-lg">You must originate <span className="font-bold text-white text-xl">{loansNeeded.toLocaleString()}</span> standard ₱5,000 loans at 10% interest to achieve profitability.</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 max-w-lg mx-auto">
                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"><p className="text-xs text-zinc-500 uppercase">Deficit</p><p className="text-lg font-bold text-rose-400">{formatCurrency(deficit)}</p></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"><p className="text-xs text-zinc-500 uppercase">Interest/Loan</p><p className="text-lg font-bold text-amber-400">₱500.00</p></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"><p className="text-xs text-zinc-500 uppercase">Loans Needed</p><p className="text-lg font-bold text-white">{loansNeeded}</p></div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2"><span>💰</span> Revenue & Collections Intelligence</h2>
          <span className="text-xs text-zinc-500 font-mono">RCI MODULE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex justify-between items-start mb-2"><p className="text-xs text-zinc-500 uppercase tracking-wider">Net Interest Margin</p><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${rciMetrics.netInterestMargin >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>{rciMetrics.netInterestMargin >= 0 ? 'PROFIT' : 'LOSS'}</span></div>
            <p className={`text-3xl font-bold ${rciMetrics.netInterestMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(rciMetrics.netInterestMargin)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex justify-between items-start mb-2"><p className="text-xs text-zinc-500 uppercase tracking-wider">At-Risk Capital</p><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${rciMetrics.atRiskCapital === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : rciMetrics.lateInstallmentsCount <= 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>{rciMetrics.atRiskCapital === 0 ? 'SAFE' : rciMetrics.lateInstallmentsCount <= 2 ? 'WATCH' : 'ALERT'}</span></div>
            <p className={`text-3xl font-bold ${rciMetrics.atRiskCapital === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(rciMetrics.atRiskCapital)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <div className="flex justify-between items-start mb-2"><p className="text-xs text-zinc-500 uppercase tracking-wider">Penalty Revenue</p><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${rciMetrics.penaltyRevenue > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-600/20 text-zinc-400 border border-zinc-600/30'}`}>{rciMetrics.penaltyRevenue > 0 ? 'ACTIVE' : 'NONE'}</span></div>
            <p className="text-3xl font-bold text-amber-400">{formatCurrency(rciMetrics.penaltyRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 bg-black border border-[#00ff00]/30 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4"><h2 className="text-sm font-bold text-[#00ff00] uppercase tracking-wider flex items-center gap-2"><span className="animate-pulse">●</span> Cash Flow Velocity</h2><span className="text-xs text-zinc-600 font-mono">90-DAY MATRIX</span></div>
          <div style={{ width: '100%', height: 320 }}>
            {hasCashFlowVelocityData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowVelocityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="1 1" stroke="#1a1a1a" vertical={false} horizontal={true} />
                  <XAxis dataKey="week" stroke="#525252" fontSize={10} tickLine={false} axisLine={{ stroke: '#262626' }} />
                  <YAxis stroke="#525252" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={{ stroke: '#262626' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #00ff00', borderRadius: '8px', color: '#00ff00' }} labelStyle={{ color: '#00ff00' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [formatCurrency(value), name === 'capitalIn' ? 'Capital In' : 'Capital Out']} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value: string) => (<span className="text-zinc-300 text-xs font-mono">{value === 'capitalIn' ? '◆ CAPITAL IN' : '◆ CAPITAL OUT'}</span>)} />
                  <Bar dataKey="capitalOut" name="capitalOut" fill="#00bcd4" radius={[2, 2, 0, 0]} opacity={0.9} />
                  <Bar dataKey="capitalIn" name="capitalIn" fill="#00ff00" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">No cash flow data available</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Liquidity Topography (30 Days)</h2>
          <div style={{ width: '100%', height: CHART_HEIGHT }}>
            {hasLiquidityData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liquidityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                  <YAxis stroke="#71717a" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="balance" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" name="Vault Balance" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">No liquidity data available</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Cash Flow Pipeline</h2>
          <div style={{ width: '100%', height: CHART_HEIGHT }}>
            {hasCashFlowData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#3f3f46' }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {cashFlowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'inflow' ? '#34d399' : entry.type === 'outflow' ? '#fb7185' : '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">No cash flow data available</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Portfolio Health (Installments)</h2>
          <div style={{ width: '100%', height: CHART_HEIGHT }}>
            {hasHealthData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={portfolioHealthData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name">
                    {portfolioHealthData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} formatter={(value: number, name: string, props: any) => [`${value} installments (${formatCurrency(props.payload.amount)})`, name]} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value: string, entry: any) => (<span style={{ color: entry.payload?.color || '#a1a1aa' }} className="text-xs">{value} ({entry.payload?.value || 0})</span>)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">No installment data available</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Velocity: Lent vs Collected (6 Months)</h2>
          <div style={{ width: '100%', height: CHART_HEIGHT }}>
            {hasVelocityData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={velocityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                  <YAxis stroke="#71717a" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value: string) => (<span className="text-zinc-300 text-xs">{value}</span>)} />
                  <Bar dataKey="lent" name="Principal Disbursed" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Principal Collected" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="interest" name="Interest Collected" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">No velocity data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Portfolio Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div><p className="text-zinc-500 text-xs uppercase tracking-wider">Total Clients</p><p className="text-2xl font-bold text-white mt-1">{summary.totalClients}</p></div>
          <div><p className="text-zinc-500 text-xs uppercase tracking-wider">Total Capital Deposits</p><p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(summary.totalDeposits)}</p></div>
          <div><p className="text-zinc-500 text-xs uppercase tracking-wider">Total Withdrawals</p><p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(summary.totalWithdrawals)}</p></div>
          <div><p className="text-zinc-500 text-xs uppercase tracking-wider">Avg Loan Size</p><p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(summary.avgLoanSize)}</p></div>
        </div>
      </div>
    </div>
  );
}
