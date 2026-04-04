"use client";

import Link from "next/link";
import { useState } from "react";

export default function CalculatorPage() {
  const [principal, setPrincipal] = useState<number>(5000);
  const [rate, setRate] = useState<number>(5);
  const [months, setMonths] = useState<number>(3);

  const totalInterest = principal * (rate / 100) * months;
  const totalRepayment = principal + totalInterest;
  const monthlyInstallment = totalRepayment / months;

  // Generate the Amortization Schedule
  const schedule = Array.from({ length: months }, (_, i) => ({
    month: i + 1,
    payment: monthlyInstallment,
    principalPortion: principal / months,
    interestPortion: totalInterest / months,
    remainingBalance: totalRepayment - (monthlyInstallment * (i + 1))
  }));

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">← Back to Dashboard</Link>
        <div>
          <h1 className="text-3xl font-bold text-[#00df82]">Loan Simulator</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time Amortization Engine</p>
        </div>

        {/* Dynamic Inputs */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 shadow-2xl space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Principal Amount (₱)</label>
            <input
              type="number"
              value={principal}
              onChange={e => setPrincipal(Number(e.target.value) || 0)}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-[#00df82] outline-none transition-all"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Monthly Rate (%)</label>
              <input
                type="number"
                value={rate}
                onChange={e => setRate(Number(e.target.value) || 0)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-[#00df82] outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Term (Months)</label>
              <input
                type="number"
                value={months}
                onChange={e => setMonths(Number(e.target.value) || 1)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-[#00df82] outline-none transition-all"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Live Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total Return</p>
            <p className="text-xl font-bold text-[#00df82]">
              ₱{totalRepayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Monthly Installment</p>
            <p className="text-xl font-bold text-white">
              ₱{monthlyInstallment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </div>

        {/* Amortization Table */}
        {months > 0 && (
          <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-[#222222] p-3 text-xs font-bold text-gray-400 flex justify-between uppercase tracking-wider">
              <span>Month</span>
              <span>Payment</span>
              <span>Balance</span>
            </div>
            {schedule.map((row) => (
              <div key={row.month} className="p-3 border-t border-[#222] flex justify-between text-sm">
                <span className="text-gray-400">M-{row.month}</span>
                <span className="text-[#00df82] font-bold">
                  ₱{row.payment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
                <span className="text-white">
                  ₱{Math.abs(row.remainingBalance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
