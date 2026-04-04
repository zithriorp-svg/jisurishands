import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import MatrixCopilot from "@/components/MatrixCopilot";
import LockVaultButton from "@/components/LockVaultButton";
import DelinquencyAlerts from "@/components/DelinquencyAlerts";
import CapitalRedeploymentQueue from "@/components/CapitalRedeploymentQueue";
import LiveClock from "@/components/LiveClock";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import TimeTravelDebug from "@/components/TimeTravelDebug";
import { getActivePortfolio } from "@/lib/portfolio";
import AgentPortalClient from "@/app/agent-portal/AgentPortalClient";

export const dynamic = "force-dynamic";

// 🚀 BULLETPROOF SERIALIZATION
const serializeLoan = (loan: any) => {
  const safeTotalRepayment = Number(loan.totalRepayment || 0);
  const computedTotalPaid = loan.installments?.reduce((sum: number, inst: any) => sum + Number(inst.amountPaid || 0), 0) || 0;
  const safeTotalPaid = Number(loan.totalPaid || computedTotalPaid);
  const safeRemainingBalance = Number(loan.remainingBalance || (safeTotalRepayment - safeTotalPaid));

  return {
    id: loan.id,
    principal: Number(loan.principal || 0),
    interestRate: Number(loan.interestRate || 0),
    termDuration: loan.termDuration || 0,
    totalRepayment: safeTotalRepayment,
    totalPaid: safeTotalPaid,
    remainingBalance: safeRemainingBalance,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    goodPayerDiscountRevoked: loan.goodPayerDiscountRevoked || false,
    installments: loan.installments?.map((inst: any) => ({
      period: inst.period,
      dueDate: inst.dueDate,
      expectedAmount: Number(inst.expectedAmount || 0),
      principal: Number(inst.principal || 0),
      interest: Number(inst.interest || 0),
      penaltyFee: Number(inst.penaltyFee || 0),
      status: inst.status,
      paymentDate: inst.paymentDate,
      amountPaid: Number(inst.amountPaid || 0)
    })) || []
  };
};

export default async function Dashboard() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value || "AGENT";
  const isAdmin = userRole === "ADMIN";
  const userName = cookieStore.get("user_name")?.value || "User";

  const portfolio = await getActivePortfolio();

  const portfolioRecords = await prisma.systemPortfolio.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
  const portfolios = portfolioRecords.map(p => ({ id: p.id, name: p.name }));

  // ============================================================================
  // 🚀 AGENT IDENTITY PROTOCOL & DYNAMIC COMMISSION FETCH
  // ============================================================================
  let agentData = null;

  if (!isAdmin) {
    if (userName && userName !== "User") {
      agentData = await prisma.agent.findFirst({
        where: {
          OR: [
            { username: userName },
            { name: userName }
          ]
        },
        include: { 
          // 🚀 WE NOW FETCH ALL LOANS & THEIR PAYMENTS TO COMPUTE LIFETIME EARNINGS
          loans: { 
            include: { 
              client: true, 
              installments: { orderBy: { period: 'asc' } },
              payments: { where: { status: 'Paid' } } // 🚀 FETCH ONLY PAID TRANSACTIONS
            } 
          }, 
          commissions: true 
        }
      });
    }

    if (!agentData) {
      agentData = await prisma.agent.findFirst({
        include: { 
          loans: { 
            include: { 
              client: true, 
              installments: { orderBy: { period: 'asc' } },
              payments: { where: { status: 'Paid' } }
            } 
          }, 
          commissions: true 
        }
      });
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7); nextWeek.setHours(23, 59, 59, 999);

  const fullLoanInclude = {
    client: { include: { application: true } }, 
    agent: { select: { id: true, name: true, phone: true, portfolio: true } },
    installments: { orderBy: { period: 'asc' } as const }
  };

  const agentFilter = (!isAdmin && agentData) ? { agentId: agentData.id } : {};

  // ============================================================================
  // 🎯 WIDE-SWEEP RADAR UPGRADE
  // ============================================================================
  const overdueInstallments = await prisma.loanInstallment.findMany({ 
    where: { 
      status: { in: ["PENDING", "LATE", "MISSED", "PARTIAL"] }, 
      dueDate: { lt: today }, 
      loan: { portfolio, ...agentFilter } 
    }, 
    include: { loan: { include: fullLoanInclude } }, 
    orderBy: { dueDate: 'asc' } 
  });

  const dueTodayInstallments = await prisma.loanInstallment.findMany({ 
    where: { 
      status: { in: ["PENDING", "PARTIAL"] }, 
      dueDate: { gte: today, lte: todayEnd }, 
      loan: { portfolio, ...agentFilter } 
    }, 
    include: { loan: { include: fullLoanInclude } }, 
    orderBy: { dueDate: 'asc' } 
  });

  const upcomingInstallments = await prisma.loanInstallment.findMany({ 
    where: { 
      status: { in: ["PENDING", "PARTIAL"] }, 
      dueDate: { gt: todayEnd, lte: nextWeek }, 
      loan: { portfolio, ...agentFilter } 
    }, 
    include: { loan: { include: fullLoanInclude } }, 
    orderBy: { dueDate: 'asc' } 
  });

  const getDaysLate = (dueDate: Date): number => { return Math.floor((today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)); };

  const mapAlerts = (installments: any[]) => installments.map(i => ({
    id: i.id, loanId: i.loanId, clientId: i.loan.clientId, period: i.period, dueDate: i.dueDate, expectedAmount: Number(i.expectedAmount),
    clientName: `${i.loan.client.firstName} ${i.loan.client.lastName}`, firstName: i.loan.client.firstName, phone: i.loan.client.phone || '',
    agentName: i.loan.agent?.name || null, daysLate: getDaysLate(i.dueDate), penaltyFee: Number(i.penaltyFee) || 0,
    fbProfileUrl: i.loan.client.application?.fbProfileUrl || null, messengerId: i.loan.client.application?.messengerId || null,
    loan: serializeLoan(i.loan)
  }));

  const alerts = { overdue: mapAlerts(overdueInstallments), dueToday: mapAlerts(dueTodayInstallments), upcoming: mapAlerts(upcomingInstallments) };

  // ============================================================================
  // 🚀 DEPLOY THE TACTICAL HUD (WITH 60/40 MATH ENGINE)
  // ============================================================================
  if (!isAdmin && agentData) {
    let totalRiskLiability = 0, totalCollected = 0, pendingCommission = 0, totalLifetimeEarnings = 0;
    
    // 🚀 DYNAMIC 60/40 CALCULATOR: 40% of all interest collected by this agent
    agentData.loans.forEach(loan => {
      const loanInterestCollected = loan.payments.reduce((sum, p) => sum + Number(p.interestPortion || 0), 0);
      totalLifetimeEarnings += (loanInterestCollected * 0.40); // 40% goes to the Agent!
    });

    // Check if the House has officially paid out any of these earnings
    let totalPaidOutByHouse = 0;
    agentData.commissions.forEach(comm => { 
      if (comm.isPaidOut) totalPaidOutByHouse += Number(comm.amount); 
    });

    // Pending payout is what they earned MINUS what the House already gave them
    pendingCommission = totalLifetimeEarnings - totalPaidOutByHouse;
    
    // We only want to show ACTIVE loans in the client list grid
    const activeLoans = agentData.loans.filter(loan => loan.status === 'ACTIVE');

    const activeClients = activeLoans.map(loan => {
      const computedTotalPaid = loan.installments?.reduce((sum: number, inst: any) => sum + Number(inst.amountPaid || 0), 0) || 0;
      const safeTotalPaid = Number(loan.totalPaid || computedTotalPaid);
      const safeRemaining = Number(loan.remainingBalance || (Number(loan.totalRepayment || 0) - safeTotalPaid));

      totalRiskLiability += safeRemaining; 
      totalCollected += safeTotalPaid;

      const nextPending = loan.installments.find(i => i.status === "PENDING" || i.status === "PARTIAL" || i.status === "LATE" || i.status === "MISSED");
      const daysLate = nextPending && new Date(nextPending.dueDate) < today ? Math.floor((today.getTime() - new Date(nextPending.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return {
        loanId: loan.id, clientId: loan.clientId, clientName: `${loan.client.firstName} ${loan.client.lastName}`, firstName: loan.client.firstName,
        phone: loan.client.phone || '', originalPrincipal: Number(loan.principal), remainingBalance: safeRemaining,
        nextDueDate: nextPending?.dueDate ? new Date(nextPending.dueDate).toISOString() : null, nextDueAmount: nextPending ? Number(nextPending.expectedAmount) : null,
        nextDuePeriod: nextPending ? nextPending.period : null, status: daysLate > 0 ? 'OVERDUE' : 'ON_TRACK', daysLate,
        fbProfileUrl: loan.client.fbProfileUrl || null, messengerId: loan.client.messengerId || null, loan: serializeLoan(loan)
      };
    });

    const processedAgentData = {
      id: agentData.id, name: agentData.name, phone: agentData.phone, username: agentData.username, createdAt: agentData.createdAt,
      activeClients: activeClients as any, totalRiskLiability, pendingCommission, totalLifetimeEarnings, totalCollected,
      commissionsCount: agentData.commissions.length, overdueCount: activeClients.filter(c => c.status === 'OVERDUE').length,
      onTrackCount: activeClients.filter(c => c.status === 'ON_TRACK').length, totalActiveLoans: activeLoans.length
    };

    return <AgentPortalClient agent={processedAgentData} alerts={alerts} portfolios={portfolios} />;
  }

  // ============================================================================
  // NORMAL MASTER ADMIN DASHBOARD
  // ============================================================================

  const ledgers = await prisma.ledger.findMany({ where: { portfolio }, orderBy: { createdAt: 'desc' }, include: { loan: { include: { client: true } }, payment: true } });
  
  const formatLedgerEntry = (ledger: typeof ledgers[0]) => {
    const amount = Number(ledger.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const clientName = ledger.loan?.client ? `${ledger.loan.client.firstName} ${ledger.loan.client.lastName}` : null;
    switch (ledger.transactionType) {
      case 'LOAN_DISBURSEMENT': case 'DISBURSEMENT': return { icon: '💸', title: 'Loan Disbursed', description: clientName ? `Disbursed ₱${amount} to ${clientName}` : `Disbursed ₱${amount}`, color: 'text-blue-400' };
      case 'LOAN_REPAYMENT': case 'REPAYMENT': return { icon: '💵', title: 'Payment Received', description: clientName ? `${clientName} paid ₱${amount}` : `Payment of ₱${amount} received`, color: 'text-emerald-400' };
      case 'CAPITAL_DEPOSIT': case 'DEPOSIT': return { icon: '🏦', title: 'Capital Injected', description: `₱${amount} added to vault`, color: 'text-emerald-400' };
      case 'CAPITAL_WITHDRAWAL': case 'WITHDRAWAL': return { icon: '📤', title: 'Capital Withdrawn', description: `₱${amount} withdrawn from vault`, color: 'text-amber-400' };
      case 'INTEREST_COLLECTION': return { icon: '📈', title: 'Interest Collected', description: clientName ? `Interest of ₱${amount} from ${clientName}` : `Interest collection: ₱${amount}`, color: 'text-yellow-400' };
      case 'PENALTY': return { icon: '⚠️', title: 'Penalty Applied', description: clientName ? `Penalty of ₱${amount} to ${clientName}` : `Penalty: ₱${amount}`, color: 'text-red-400' };
      case 'ROLLOVER_FEE': return { icon: '🔄', title: 'Rollover Processed', description: clientName ? `6% Extension Fee: ₱${amount} from ${clientName}` : `Rollover Fee: ₱${amount}`, color: 'text-amber-500' };
      default: return { icon: '📋', title: ledger.transactionType, description: `${ledger.debitAccount} → ${ledger.creditAccount}`, color: 'text-zinc-400' };
    }
  };
  
  const preApprovedApps = await prisma.application.findMany({ where: { portfolio, status: 'PRE-APPROVED' }, orderBy: { id: 'desc' } });
  const pendingApps = await prisma.application.findMany({ where: { portfolio, status: 'Pending' }, orderBy: { id: 'desc' } });

  let vaultCash = 0, outstandingLoans = 0, deployableCapital = 0, projectedRebates = 0;

  if (isAdmin) {
    const capitalTransactions = await prisma.capitalTransaction.findMany({ where: { portfolio } });
    let totalCapitalDeposits = 0, totalCapitalWithdrawals = 0;
    capitalTransactions.forEach(tx => { if (tx.type === "DEPOSIT") totalCapitalDeposits += Number(tx.amount); else totalCapitalWithdrawals += Number(tx.amount); });
    const expenses = await prisma.expense.findMany({ where: { portfolio } });
    let totalExpenses = 0;
    expenses.forEach(exp => totalExpenses += Number(exp.amount));
    let totalDisbursements = 0;
    ledgers.forEach(entry => { if (entry.debitAccount === "Loans Receivable") totalDisbursements += Number(entry.amount); });
    const loansInPortfolio = await prisma.loan.findMany({ where: { portfolio }, select: { id: true } });
    const loanIds = loansInPortfolio.map(l => l.id);
    const payments = await prisma.payment.findMany({ where: { loanId: { in: loanIds }, status: "Paid" } });
    let totalPrincipalCollected = 0, totalInterestCollected = 0;
    payments.forEach(p => { totalPrincipalCollected += Number(p.principalPortion); totalInterestCollected += Number(p.interestPortion); });
    vaultCash = totalCapitalDeposits - totalCapitalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;
    outstandingLoans = totalDisbursements - totalPrincipalCollected;
    deployableCapital = Number(vaultCash) * 0.85;
    const activeLoans = await prisma.loan.findMany({ where: { portfolio, status: 'ACTIVE' }, select: { principal: true } });
    let totalActivePrincipal = 0;
    activeLoans.forEach(loan => { totalActivePrincipal += Number(loan.principal); });
    projectedRebates = totalActivePrincipal * 0.04;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{isAdmin ? "Executive Dashboard" : "Agent Dashboard"}</h1>
          <p className="text-sm text-zinc-500">Welcome, <span className="text-yellow-400">{userName}</span> • Portfolio: <span className="text-yellow-400">{portfolio}</span></p>
        </div>
        <LockVaultButton />
      </div>

      <LiveClock />

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Available Vault Cash</p>
            <p className="text-3xl font-bold text-emerald-400">₱{vaultCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">⚡ Deployable Capital (85%)</p>
            <p className="text-3xl font-bold text-emerald-400">₱{deployableCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-zinc-500 mt-1">15% safety reserve</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Outstanding Loans</p>
            <p className="text-3xl font-bold text-blue-400">₱{outstandingLoans.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
            <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">⭐ PROJECTED REBATES (4%)</p>
            <p className="text-3xl font-bold text-amber-400">₱{projectedRebates.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-zinc-500 mt-1">Incentive pool for on-time payments</p>
          </div>
        </div>
      )}

      <DelinquencyAlerts overdue={alerts.overdue as any} dueToday={alerts.dueToday as any} upcoming={alerts.upcoming as any} />

      {isAdmin && <CapitalRedeploymentQueue />}
      <QuickActionsGrid isAdmin={isAdmin} portfolios={portfolios} />
      {isAdmin && <MatrixCopilot />}

      {preApprovedApps.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2"><span className="text-lg">⚡</span> PRE-APPROVED Applications</h2>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded-full">FAST-TRACK READY</span>
          </div>
          <div className="space-y-3">
            {preApprovedApps.slice(0, 5).map(app => (
              <Link href={`/review/${app.id}`} key={app.id} className="flex justify-between items-center p-4 bg-emerald-950/50 hover:bg-emerald-900/50 rounded-xl border border-emerald-500/20 transition-all">
                <div>
                  <div className="flex items-center gap-2"><p className="font-bold text-white">{app.firstName} {app.lastName}</p><span className="text-xs bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">⚡ PRIME AUTO-APPROVED</span></div>
                  <p className="text-xs text-emerald-400/70 truncate max-w-[300px]">{app.aiRiskSummary}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{app.credibilityScore || 10}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4"><h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Pending Applications</h2><span className="text-xs text-zinc-500">AI-RATED</span></div>
        <div className="space-y-3">
          {pendingApps.length === 0 ? <p className="text-zinc-500 text-center py-4">No pending applications.</p> : pendingApps.slice(0, 5).map(app => (
            <Link href={`/review/${app.id}`} key={app.id} className="flex justify-between items-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all">
              <div><p className="font-bold text-white">{app.firstName} {app.lastName}</p><p className="text-xs text-zinc-500 truncate max-w-[200px]">{app.aiRiskSummary}</p></div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${(app.credibilityScore || 0) >= 7 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : (app.credibilityScore || 0) >= 4 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{app.credibilityScore || '-'}</div>
            </Link>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Recent Ledger Activity</h2>
          <div className="space-y-2">
            {ledgers.length === 0 ? <p className="text-zinc-500 text-center py-4">No ledger transactions yet.</p> : ledgers.slice(0, 5).map(ledger => {
              const entry = formatLedgerEntry(ledger);
              return (
                <div key={ledger.id} className="flex justify-between items-center p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-lg">{entry.icon}</span><p className="font-bold text-zinc-200">{entry.title}</p></div>
                    <p className={`text-sm mt-1 ${entry.color}`}>{entry.description}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-zinc-500 text-xs">{new Date(ledger.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-zinc-600 text-xs">{new Date(ledger.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 RESTORED TIME TRAVEL DEBUG TOOL */}
      {isAdmin && <TimeTravelDebug />}
    </div>
  );
}

