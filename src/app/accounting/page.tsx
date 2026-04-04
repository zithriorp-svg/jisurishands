import { prisma } from "@/lib/db";
import Link from "next/link";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  const portfolio = await getActivePortfolio();
  
  const capitalTransactions = await prisma.capitalTransaction.findMany({
    where: { portfolio }
  });
  let totalCapitalDeposits = 0;
  let totalCapitalWithdrawals = 0;
  capitalTransactions.forEach(tx => {
    const amt = Number(tx.amount);
    if (tx.type === "DEPOSIT") totalCapitalDeposits += amt;
    else totalCapitalWithdrawals += amt;
  });

  const expenses = await prisma.expense.findMany({
    where: { portfolio }
  });
  let totalExpenses = 0;
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(exp => {
    const amt = Number(exp.amount);
    totalExpenses += amt;
    if (!expensesByCategory[exp.category]) expensesByCategory[exp.category] = 0;
    expensesByCategory[exp.category] += amt;
  });

  const ledgers = await prisma.ledger.findMany({
    where: { portfolio }
  });
  let totalDisbursements = 0;
  ledgers.forEach(entry => {
    if (entry.debitAccount === "Loans Receivable") totalDisbursements += Number(entry.amount);
  });

  // Get loans in this portfolio for payment filtering
  const loansInPortfolio = await prisma.loan.findMany({
    where: { portfolio },
    select: { id: true }
  });
  const loanIds = loansInPortfolio.map(l => l.id);

  const payments = await prisma.payment.findMany({ 
    where: { 
      loanId: { in: loanIds },
      status: "Paid" 
    } 
  });
  let totalPrincipalCollected = 0;
  let totalInterestCollected = 0;
  payments.forEach(p => {
    totalPrincipalCollected += Number(p.principalPortion);
    totalInterestCollected += Number(p.interestPortion);
  });

  const vaultCash = totalCapitalDeposits - totalCapitalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;
  const outstandingPrincipal = totalDisbursements - totalPrincipalCollected;

  const cashInflows = { "Capital Deposits": totalCapitalDeposits, "Loan Repayments": totalPrincipalCollected, "Interest Income": totalInterestCollected };
  const totalInflows = Object.values(cashInflows).reduce((a, b) => a + b, 0);
  const cashOutflows = { "Capital Withdrawals": totalCapitalWithdrawals, "Loan Disbursements": totalDisbursements, "Operating Expenses": totalExpenses };
  const totalOutflows = Object.values(cashOutflows).reduce((a, b) => a + b, 0);
  const netCashFlow = totalInflows - totalOutflows;

  const assets = { "Vault Cash": vaultCash, "Outstanding Loans": outstandingPrincipal };
  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const liabilitiesEquity = { "Owner's Capital": totalCapitalDeposits - totalCapitalWithdrawals, "Retained Earnings": totalInterestCollected - totalExpenses };
  const totalLiabilitiesEquity = Object.values(liabilitiesEquity).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounting Reports</h1>
          <p className="text-sm text-zinc-500">Portfolio: <span className="text-yellow-400">{portfolio}</span></p>
        </div>
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vault Cash</p>
          <p className="text-2xl font-bold text-emerald-400">₱{vaultCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Outstanding Loans</p>
          <p className="text-2xl font-bold text-blue-400">₱{outstandingPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Cash Flow Statement</h2>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-emerald-400 font-bold uppercase">Inflows</p>
          {Object.entries(cashInflows).map(([label, amount]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="text-emerald-400">+₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-red-400 font-bold uppercase">Outflows</p>
          {Object.entries(cashOutflows).map(([label, amount]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="text-red-400">-₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-3 border-t border-zinc-700">
          <span className="font-bold text-white">Net Cash Flow</span>
          <span className={`font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₱{netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Trial Balance</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-emerald-400 font-bold uppercase mb-2">Assets</p>
            {Object.entries(assets).map(([label, amount]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-400">{label}</span>
                <span className="text-white">₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-2 border-t border-zinc-700">
              <span className="font-bold text-zinc-300">Total</span>
              <span className="font-bold text-emerald-400">₱{totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-yellow-400 font-bold uppercase mb-2">Liabilities & Equity</p>
            {Object.entries(liabilitiesEquity).map(([label, amount]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-400">{label}</span>
                <span className="text-white">₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-2 border-t border-zinc-700">
              <span className="font-bold text-zinc-300">Total</span>
              <span className="font-bold text-yellow-400">₱{totalLiabilitiesEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
