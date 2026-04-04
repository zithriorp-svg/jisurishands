import Link from "next/link";
import { prisma } from "@/lib/db";
import { Clipboard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  // 1. Fetch entire ledger
  const ledger = await prisma.ledger.findMany();

  // 2. Compute Trial Balance mathematically in memory
  const tb: Record<string, { debit: number, credit: number }> = {};
  let totalDebit = 0;
  let totalCredit = 0;

  ledger.forEach(entry => {
    // Process Debits
    if (!tb[entry.debitAccount]) tb[entry.debitAccount] = { debit: 0, credit: 0 };
    tb[entry.debitAccount].debit += Number(entry.amount);
    totalDebit += Number(entry.amount);

    // Process Credits
    if (!tb[entry.creditAccount]) tb[entry.creditAccount] = { debit: 0, credit: 0 };
    tb[entry.creditAccount].credit += Number(entry.amount);
    totalCredit += Number(entry.amount);
  });

  const accounts = Object.keys(tb).sort();

  return (
    <main className="min-h-screen flex flex-col bg-[#0f0f13]">
      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center px-4 py-3 border-b border-[#1c1c21] bg-[#0f0f13] sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <span className="text-white font-extrabold text-xl tracking-wide">FinTech</span>
          <span className="bg-[#1c1c21] border border-[#2a2a35] text-xs px-3 py-1.5 rounded-full text-gray-300">
            Cebu Branch
          </span>
        </div>
        <div className="bg-[#1c1c21] border border-[#2a2a35] text-xs px-3 py-1.5 rounded-full font-bold">
          <span className="text-yellow-500">FY:</span> <span className="text-white">2026</span>
        </div>
      </header>

      {/* GLOBAL NAVIGATION */}
      <nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b border-[#1c1c21] hide-scrollbar bg-[#0f0f13]">
        <Link href="/" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Dashboard</Link>
        <Link href="/clients" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Clients</Link>
        <Link href="/new-loan" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Origination</Link>
        <Link href="/collections" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Payments</Link>
        <Link href="/treasury" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Treasury</Link>
        <span className="text-[#38bdf8] font-bold border-b-2 border-[#38bdf8] pb-1 whitespace-nowrap">Ledger</span>
        <span className="text-gray-500 font-medium pb-1 whitespace-nowrap">Audit Log</span>
        <span className="text-gray-500 font-medium pb-1 whitespace-nowrap">⚙️</span>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
        {/* View Header & Action */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#38bdf8] mb-1 tracking-tight">Trial Balance</h1>
            <p className="text-gray-400 text-sm">Active Database: <span className="text-white font-medium">Main Branch (Cloud Edition)</span></p>
          </div>
          <a href="/api/export" className="flex items-center gap-2 bg-[#1c1c21] border border-[#2a2a35] px-3 py-2 rounded-lg text-gray-400 text-xs font-bold hover:text-white hover:border-gray-500 transition-colors shadow-lg">
            <Clipboard size={14} />
            Copy CSV
          </a>
        </div>

        {/* Data Table */}
        <div className="bg-[#1c1c21] border border-[#2a2a35] rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1a1c23] text-gray-400 text-xs uppercase tracking-wider border-b border-[#2a2a35]">
                <tr>
                  <th className="px-4 py-4 font-bold">Account</th>
                  <th className="px-4 py-4 font-bold text-right">Debit (₱)</th>
                  <th className="px-4 py-4 font-bold text-right">Credit (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a35]">
                {accounts.map(acc => (
                  <tr key={acc} className="hover:bg-[#202026] transition-colors">
                    <td className="px-4 py-4 text-white font-medium">{acc}</td>
                    <td className="px-4 py-4 text-right font-bold text-[#00df82]">
                      {tb[acc].debit > 0 ? tb[acc].debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">
                      {tb[acc].credit > 0 ? tb[acc].credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span className="text-gray-600">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#1a1c23] border-t-2 border-[#38bdf8]">
                <tr>
                  <td className="px-4 py-4 font-extrabold text-white">GRAND TOTAL</td>
                  <td className="px-4 py-4 text-right font-extrabold text-[#00df82] underline decoration-double">
                    {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-right font-extrabold text-red-500 underline decoration-double">
                    {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
