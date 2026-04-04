import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, ArrowRight, Scale, BookOpen, Wallet } from "lucide-react";
import TreasuryForm from "./TreasuryForm";

export const dynamic = "force-dynamic";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function getActivePortfolio() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;
}

const formatMoney = (amount: number) => "₱" + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: any) => {
  if (!date) return "Unknown Date";
  return new Date(date).toLocaleString('en-US', { 
    timeZone: 'Asia/Manila', 
    month: 'short', 
    day: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export default async function TreasuryDashboard() {
  const portfolio = await getActivePortfolio();

  const ledgerEntries = await prisma.ledger.findMany({
    where: { portfolio },
    orderBy: { createdAt: 'desc' },
    include: {
      loan: {
        include: { client: true }
      }
    }
  });

  const accounts: Record<string, { debit: number; credit: number }> = {};
  let totalDebit = 0;
  let totalCredit = 0;

  let flow = {
    principalRepaid: 0,
    interestEarned: 0,
    feesEarned: 0,
    loansDisbursed: 0,
    agentCommissions: 0,
    capitalInjected: 0,
    capitalWithdrawn: 0,
  };

  ledgerEntries.forEach((entry: any) => {
    const amt = Number(entry.amount?.toString() || 0);
    const dr = String(entry.debitAccount || "Unknown");
    const cr = String(entry.creditAccount || "Unknown");

    if (!accounts[dr]) accounts[dr] = { debit: 0, credit: 0 };
    if (!accounts[cr]) accounts[cr] = { debit: 0, credit: 0 };
    
    accounts[dr].debit += amt;
    accounts[cr].credit += amt;
    totalDebit += amt;
    totalCredit += amt;

    if (dr === "Vault Cash" && cr === "Loans Receivable") flow.principalRepaid += amt;
    if (dr === "Vault Cash" && cr === "Interest Income") flow.interestEarned += amt;
    if (dr === "Vault Cash" && (cr === "Fee Income" || cr === "Penalty Income")) flow.feesEarned += amt;
    if (dr === "Vault Cash" && cr === "Owner Equity") flow.capitalInjected += amt; 
    
    if (dr === "Loans Receivable" && cr === "Vault Cash") flow.loansDisbursed += amt;
    if (dr === "Commission Expense" && cr === "Vault Cash") flow.agentCommissions += amt;
    if (dr === "Owner Equity" && cr === "Vault Cash") flow.capitalWithdrawn += amt; 
  });

  const totalInflows = flow.principalRepaid + flow.interestEarned + flow.feesEarned + flow.capitalInjected;
  const totalOutflows = flow.loansDisbursed + flow.agentCommissions + flow.capitalWithdrawn;
  const netCashFlow = totalInflows - totalOutflows;

  return (
    <div className="min-h-screen bg-black text-zinc-300 pb-20 font-sans">
      <div className="bg-zinc-950 border-b border-zinc-800 p-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/" className="p-2 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white border border-zinc-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-yellow-500" /> Master Treasury
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Double-Entry Financial Core &bull; {portfolio}</p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-6">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4" /> Capital Control (Inject / Withdraw)
          </h2>
          <TreasuryForm />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Cash Flow Pipeline
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative">
            <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/20 via-yellow-500/20 to-rose-500/20 z-0"></div>

            <div className="w-full sm:w-1/3 flex flex-col gap-3 z-10">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center sm:text-left mb-2">Sources of Cash</div>
              <FlowCard label="Capital Injected" amount={flow.capitalInjected} color="emerald" />
              <FlowCard label="Principal Repaid" amount={flow.principalRepaid} color="blue" />
              <FlowCard label="Interest Earned" amount={flow.interestEarned} color="purple" />
              <FlowCard label="Fees & Penalties" amount={flow.feesEarned} color="orange" />
            </div>

            <div className="z-10 my-4 sm:my-0 flex flex-col items-center">
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl transition-all ${netCashFlow >= 0 ? 'border-emerald-500/50 bg-emerald-950/30 shadow-emerald-500/20' : 'border-rose-500/50 bg-rose-950/30 shadow-rose-500/20'}`}>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center px-2">Net Cash Flow</span>
                <span className={`text-xl font-black ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatMoney(netCashFlow)}
                </span>
              </div>
            </div>

            <div className="w-full sm:w-1/3 flex flex-col gap-3 z-10">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center sm:text-right mb-2">Uses of Cash</div>
              <FlowCard label="Loans Disbursed" amount={flow.loansDisbursed} color="rose" align="right" />
              <FlowCard label="Capital Withdrawn" amount={flow.capitalWithdrawn} color="rose" align="right" />
              <FlowCard label="Agent Commissions" amount={flow.agentCommissions} color="orange" align="right" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden w-full">
          <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" /> Trial Balance
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">BALANCED</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left border-collapse">
              <thead>
                <tr className="bg-zinc-800/50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <th className="p-4 border-b border-zinc-800">Account Name</th>
                  <th className="p-4 border-b border-zinc-800 text-right">Debit (Dr)</th>
                  <th className="p-4 border-b border-zinc-800 text-right">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {Object.entries(accounts).map(([accountName, balances]) => (
                  <tr key={accountName} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="p-4 font-bold text-zinc-300">{accountName}</td>
                    <td className="p-4 text-right text-emerald-400">{balances.debit > 0 ? formatMoney(balances.debit) : "-"}</td>
                    <td className="p-4 text-right text-rose-400">{balances.credit > 0 ? formatMoney(balances.credit) : "-"}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-950 font-bold text-sm">
                  <td className="p-4 text-right text-zinc-500 uppercase tracking-widest text-[10px]">Grand Totals</td>
                  <td className="p-4 text-right text-emerald-400 border-t-2 border-emerald-500/50">{formatMoney(totalDebit)}</td>
                  <td className="p-4 text-right text-rose-400 border-t-2 border-rose-500/50">{formatMoney(totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden w-full">
          <div className="p-4 sm:p-6 border-b border-zinc-800 bg-zinc-950">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-yellow-400" /> Immutable Ledger Records
            </h2>
          </div>
          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-800/50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <th className="p-4 border-b border-zinc-800">Date / Ref</th>
                  <th className="p-4 border-b border-zinc-800">Transaction Type</th>
                  <th className="p-4 border-b border-zinc-800">Client / Source</th>
                  <th className="p-4 border-b border-zinc-800">Debit (In)</th>
                  <th className="p-4 border-b border-zinc-800">Credit (Out)</th>
                  <th className="p-4 border-b border-zinc-800 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {ledgerEntries.map((entry: any) => {
                  const amt = Number(entry.amount?.toString() || 0);
                  const dr = String(entry.debitAccount || "Unknown");
                  const cr = String(entry.creditAccount || "Unknown");
                  const txType = String(entry.transactionType || "");
                  const txDate = entry.createdAt || entry.date;

                  return (
                    <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono">
                        <div className="text-zinc-300">{formatDate(txDate)}</div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">LGR-{String(entry.id).padStart(6, '0')}</div>
                      </td>
                      <td className="p-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">{txType}</td>
                      <td className="p-4">
                        {entry.loan?.client ? (
                          <span className="text-blue-400 font-bold">{entry.loan.client.firstName} {entry.loan.client.lastName}</span>
                        ) : (
                          <span className="text-zinc-600 italic">{txType.includes('Capital') ? 'Owner' : 'System Auto'}</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-emerald-400/80">{dr}</td>
                      <td className="p-4 font-mono text-rose-400/80">{cr}</td>
                      <td className="p-4 text-right font-bold text-white">{formatMoney(amt)}</td>
                    </tr>
                  );
                })}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500 italic">No transactions recorded in the ledger yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function FlowCard({ label, amount, color, align = "left" }: { label: string, amount: number, color: string, align?: "left" | "right" }) {
  if (amount === 0) return null; 
  
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-950/30 border-emerald-500/30 text-emerald-400",
    blue: "bg-blue-950/30 border-blue-500/30 text-blue-400",
    purple: "bg-purple-950/30 border-purple-500/30 text-purple-400",
    rose: "bg-rose-950/30 border-rose-500/30 text-rose-400",
    orange: "bg-orange-950/30 border-orange-500/30 text-orange-400",
  };

  return (
    <div className={`p-3 rounded-xl border ${colorMap[color]} flex items-center justify-between gap-4 w-full shadow-lg relative overflow-hidden group`}>
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]`}></div>
      {align === "right" && <ArrowRight className="w-4 h-4 opacity-50 flex-shrink-0" />}
      <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
        <div className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{label}</div>
        <div className="text-sm font-black mt-0.5">{formatMoney(amount)}</div>
      </div>
      {align === "left" && <ArrowRight className="w-4 h-4 opacity-50 flex-shrink-0" />}
    </div>
  );
}
