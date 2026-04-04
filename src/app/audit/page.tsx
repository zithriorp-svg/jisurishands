import { prisma } from "@/lib/db";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

// Format currency
const formatCurrency = (value: number): string => {
  return "₱" + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format date time
const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get icon for transaction type
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'DISBURSEMENT':
    case 'FAST_TRACK':
      return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
    case 'REPAYMENT':
      return <ArrowDownRight className="w-4 h-4 text-emerald-400" />;
    case 'EXPENSE':
      return <TrendingDown className="w-4 h-4 text-amber-400" />;
    case 'CAPITAL_DEPOSIT':
      return <DollarSign className="w-4 h-4 text-blue-400" />;
    case 'CAPITAL_WITHDRAWAL':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    case 'PENALTY':
      return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    default:
      return <TrendingUp className="w-4 h-4 text-zinc-400" />;
  }
};

// Get color for transaction type
const getTypeColor = (type: string): string => {
  switch (type) {
    case 'DISBURSEMENT':
    case 'FAST_TRACK':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    case 'REPAYMENT':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'EXPENSE':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'CAPITAL_DEPOSIT':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'CAPITAL_WITHDRAWAL':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'PENALTY':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    default:
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
  }
};

// Get sign for transaction type (positive = adds to vault, negative = subtracts from vault)
const getTypeSign = (type: string): number => {
  switch (type) {
    case 'REPAYMENT':
    case 'CAPITAL_DEPOSIT':
    case 'PENALTY':
      return 1; // Adds to vault
    case 'DISBURSEMENT':
    case 'FAST_TRACK':
    case 'EXPENSE':
    case 'CAPITAL_WITHDRAWAL':
      return -1; // Subtracts from vault
    default:
      return 0;
  }
};

export default async function AuditLedgerPage() {
  const portfolio = await getActivePortfolio();

  // Fetch all audit logs for this portfolio
  const auditLogs = await prisma.auditLog.findMany({
    where: { portfolio },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  // Calculate sum from AuditLog
  let auditLogSum = 0;
  auditLogs.forEach(log => {
    auditLogSum += Number(log.amount) * getTypeSign(log.type);
  });

  // Calculate actual Vault Cash from financial records
  const capitalTransactions = await prisma.capitalTransaction.findMany({
    where: { portfolio }
  });
  let totalDeposits = 0, totalWithdrawals = 0;
  capitalTransactions.forEach(tx => {
    if (tx.type === "DEPOSIT") totalDeposits += Number(tx.amount);
    else totalWithdrawals += Number(tx.amount);
  });

  const ledgers = await prisma.ledger.findMany({
    where: { portfolio },
    select: { debitAccount: true, amount: true }
  });

  let totalDisbursements = 0;
  ledgers.forEach(entry => {
    if (entry.debitAccount === "Loans Receivable") totalDisbursements += Number(entry.amount);
  });

  const loansInPortfolio = await prisma.loan.findMany({
    where: { portfolio },
    select: { id: true }
  });
  const loanIds = loansInPortfolio.map(l => l.id);

  const payments = await prisma.payment.findMany({
    where: { loanId: { in: loanIds }, status: "Paid" }
  });

  let totalPrincipalCollected = 0, totalInterestCollected = 0;
  payments.forEach(p => {
    totalPrincipalCollected += Number(p.principalPortion);
    totalInterestCollected += Number(p.interestPortion);
  });

  const expenses = await prisma.expense.findMany({
    where: { portfolio }
  });
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Actual Vault Cash calculation
  const calculatedVaultCash = totalDeposits - totalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;

  // Reconciliation check
  const variance = calculatedVaultCash - auditLogSum;
  const isReconciled = Math.abs(variance) < 0.01; // Allow for floating point precision

  // Type counts
  const typeCounts = {
    disbursements: auditLogs.filter(l => l.type === 'DISBURSEMENT' || l.type === 'FAST_TRACK').length,
    repayments: auditLogs.filter(l => l.type === 'REPAYMENT').length,
    expenses: auditLogs.filter(l => l.type === 'EXPENSE').length,
    capital: auditLogs.filter(l => l.type === 'CAPITAL_DEPOSIT' || l.type === 'CAPITAL_WITHDRAWAL').length
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#0f0f13]">
      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center px-4 py-3 border-b border-[#1c1c21] bg-[#0f0f13] sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <span className="text-white font-extrabold text-xl tracking-wide">FinTech</span>
          <span className="bg-[#1c1c21] border border-[#2a2a35] text-xs px-3 py-1.5 rounded-full text-gray-300">
            {portfolio}
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
        <Link href="/payments" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Payments</Link>
        <Link href="/treasury" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Treasury</Link>
        <Link href="/analytics" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Analytics</Link>
        <span className="text-[#a855f7] font-bold border-b-2 border-[#a855f7] pb-1 whitespace-nowrap flex items-center gap-1">
          <ShieldCheck size={14} /> Audit Ledger
        </span>
        <Link href="/settings" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">⚙️</Link>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
        {/* View Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#a855f7] mb-1 tracking-tight flex items-center gap-2">
              <ShieldCheck size={24} /> Immutable Audit Ledger
            </h1>
            <p className="text-gray-400 text-sm">Chronological transaction log • {auditLogs.length} entries</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Last Updated</p>
            <p className="text-sm text-white font-medium">
              {auditLogs[0] ? formatDateTime(auditLogs[0].createdAt) : 'No entries'}
            </p>
          </div>
        </div>

        {/* RECONCILIATION VARIANCE CHECK */}
        <div className={`rounded-2xl p-6 border shadow-lg ${
          isReconciled
            ? 'bg-emerald-900/20 border-emerald-500/30'
            : 'bg-rose-900/20 border-rose-500/50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              {isReconciled ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">✓ RECONCILIATION PASSED</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                  <span className="text-rose-400">🚨 RECONCILIATION VARIANCE ALERT</span>
                </>
              )}
            </h2>
            <span className={`px-3 py-1 rounded text-xs font-bold ${
              isReconciled
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}>
              {isReconciled ? 'VERIFIED' : 'DISCREPANCY DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-500 uppercase mb-1">Calculated Vault Cash</p>
              <p className="text-xl font-bold text-white">{formatCurrency(calculatedVaultCash)}</p>
              <p className="text-xs text-zinc-600 mt-1">From financial records</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-500 uppercase mb-1">Audit Log Sum</p>
              <p className="text-xl font-bold text-white">{formatCurrency(auditLogSum)}</p>
              <p className="text-xs text-zinc-600 mt-1">From audit entries</p>
            </div>
            <div className={`rounded-xl p-4 border ${
              Math.abs(variance) < 0.01
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <p className="text-xs text-zinc-500 uppercase mb-1">Variance</p>
              <p className={`text-xl font-bold ${Math.abs(variance) < 0.01 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(Math.abs(variance))}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {Math.abs(variance) < 0.01 ? 'Perfect match' : 'Difference detected'}
              </p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-500 uppercase mb-1">Status</p>
              <p className={`text-xl font-bold ${isReconciled ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isReconciled ? 'RECONCILED' : 'UNRECONCILED'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {auditLogs.length} transactions logged
              </p>
            </div>
          </div>

          {!isReconciled && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <p className="text-sm text-rose-400 font-bold mb-1">⚠️ Immediate Action Required</p>
              <p className="text-xs text-zinc-400">
                The calculated vault cash does not match the sum of audit log entries.
                This may indicate missing transactions, data corruption, or unauthorized modifications.
                Please investigate immediately.
              </p>
            </div>
          )}
        </div>

        {/* TRANSACTION TYPE SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4">
            <p className="text-xs text-rose-400 uppercase mb-1">Disbursements</p>
            <p className="text-2xl font-bold text-white">{typeCounts.disbursements}</p>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-xs text-emerald-400 uppercase mb-1">Repayments</p>
            <p className="text-2xl font-bold text-white">{typeCounts.repayments}</p>
          </div>
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
            <p className="text-xs text-amber-400 uppercase mb-1">Expenses</p>
            <p className="text-2xl font-bold text-white">{typeCounts.expenses}</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <p className="text-xs text-blue-400 uppercase mb-1">Capital Movements</p>
            <p className="text-2xl font-bold text-white">{typeCounts.capital}</p>
          </div>
        </div>

        {/* AUDIT LOG TABLE */}
        <div className="bg-[#1c1c21] border border-[#2a2a35] rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a35] flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transaction Timeline</h3>
            <span className="text-xs text-zinc-500">Descending by date</span>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1a1c23] text-gray-400 text-[10px] uppercase tracking-wider border-b border-[#2a2a35] sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-bold w-32">DATE/TIME</th>
                  <th className="px-4 py-3 font-bold w-28">TYPE</th>
                  <th className="px-4 py-3 font-bold">DESCRIPTION</th>
                  <th className="px-4 py-3 font-bold text-right w-32">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a35]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#202026] transition-colors align-top">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs text-zinc-400">
                        {formatDateTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getTypeColor(log.type)}`}>
                          {log.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-zinc-300 text-xs leading-relaxed">{log.description}</p>
                      {log.referenceId && (
                        <p className="text-zinc-600 text-xs mt-1">Ref: {log.referenceType} #{log.referenceId}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className={`font-bold text-sm ${
                        getTypeSign(log.type) > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {getTypeSign(log.type) > 0 ? '+' : '-'}{formatCurrency(Number(log.amount))}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 py-4">
          <p>Immutable Audit Ledger • All transactions permanently recorded • Portfolio: {portfolio}</p>
        </div>
      </div>
    </main>
  );
}
