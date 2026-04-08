import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const portfolio = await getActivePortfolio();

    const loans = await prisma.loan.findMany({
      where: { portfolio },
      include: {
        installments: { orderBy: { period: 'asc' } },
        payments: { where: { status: 'Paid' }, orderBy: { paymentDate: 'asc' } }
      }
    });
    
    const ledgers = await prisma.ledger.findMany({
      where: { portfolio },
      orderBy: { createdAt: 'asc' }
    });

    const capitalTxs = await prisma.capitalTransaction.findMany({ where: { portfolio } });
    const expenses = await prisma.expense.findMany({ where: { portfolio } });

    let currentVaultCash = 0;
    let outstandingPrincipal = 0;
    let totalDisbursed = 0;
    let totalCollected = 0;
    let totalInterestCollected = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalExpenseAmount = 0;

    capitalTxs.forEach(tx => {
      if (tx.type === "DEPOSIT") totalDeposits += Number(tx.amount);
      else totalWithdrawals += Number(tx.amount);
    });

    expenses.forEach(exp => { totalExpenseAmount += Number(exp.amount); });

    loans.forEach(loan => {
      const loanDisbursed = Number(loan.principal);
      totalDisbursed += loanDisbursed;
      
      const loanCollectedPrincipal = loan.payments.reduce((sum, p) => sum + Number(p.principalPortion), 0);
      const loanCollectedInterest = loan.payments.reduce((sum, p) => sum + Number(p.interestPortion), 0);
      
      totalCollected += loanCollectedPrincipal;
      totalInterestCollected += loanCollectedInterest;
      
      outstandingPrincipal += Math.max(0, loanDisbursed - loanCollectedPrincipal);
    });

    currentVaultCash = totalDeposits + totalCollected + totalInterestCollected - totalWithdrawals - totalDisbursed - totalExpenseAmount;

    let activeLoans = 0;
    let activeDisbursedPrincipal = 0;
    let portfolioAtRisk = 0;
    let loansAtRiskCount = 0;
    let penaltyRevenue = 0;
    let lateInstallmentsCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    loans.forEach(loan => {
      if (loan.status === 'ACTIVE') {
        activeLoans++;
        activeDisbursedPrincipal += Number(loan.principal);
      }
      
      let isAtRisk = false;
      const loanCollectedPrincipal = loan.payments.reduce((sum, p) => sum + Number(p.principalPortion), 0);
      const remainingLoanPrincipal = Math.max(0, Number(loan.principal) - loanCollectedPrincipal);

      loan.installments.forEach(inst => {
        penaltyRevenue += Number(inst.penaltyFee || 0);
        if ((inst.status === 'LATE' || inst.status === 'MISSED' || inst.status === 'PENDING') && new Date(inst.dueDate) < today) {
          lateInstallmentsCount++;
          isAtRisk = true;
        }
      });

      if (isAtRisk && loan.status === 'ACTIVE') {
        loansAtRiskCount++;
        portfolioAtRisk += remainingLoanPrincipal;
      }
    });

    const totalClients = new Set(loans.map(l => l.clientId)).size;
    const avgLoanSize = loans.length > 0 ? totalDisbursed / loans.length : 0;
    const capitalUtilizationRatio = currentVaultCash + activeDisbursedPrincipal > 0 ? (activeDisbursedPrincipal / (currentVaultCash + activeDisbursedPrincipal)) * 100 : 0;
    const netInterestMargin = totalInterestCollected - totalExpenseAmount;
    const costToIncomeRatio = totalInterestCollected > 0 ? (totalExpenseAmount / totalInterestCollected) * 100 : totalExpenseAmount > 0 ? 100 : 0;

    let runningBalance = totalDeposits; 
    const liquidityMap = new Map<string, { balance: number, in: number, out: number }>();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      liquidityMap.set(dateStr, { balance: 0, in: 0, out: 0 });
    }

    ledgers.forEach(l => {
      const dateStr = new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (liquidityMap.has(dateStr)) {
        const entry = liquidityMap.get(dateStr)!;
        if (l.debitAccount === "Vault Cash") { runningBalance += Number(l.amount); entry.in += Number(l.amount); }
        if (l.creditAccount === "Vault Cash") { runningBalance -= Number(l.amount); entry.out += Number(l.amount); }
        entry.balance = runningBalance;
      }
    });

    let lastKnownBalance = 0;
    const liquidityData = Array.from(liquidityMap.entries()).map(([date, data]) => {
      if (data.balance > 0 || data.in > 0 || data.out > 0) { lastKnownBalance = data.balance; } 
      else { data.balance = lastKnownBalance; }
      return { date, balance: data.balance, inflows: data.in, outflows: data.out };
    });

    const cashFlowData = [
      { name: "Capital In", value: Number(totalDeposits.toFixed(2)), type: "inflow" },
      { name: "Withdrawals", value: Number(totalWithdrawals.toFixed(2)), type: "outflow" },
      { name: "Vault Cash", value: Number(currentVaultCash.toFixed(2)), type: "balance" },
      { name: "Disbursed", value: Number(totalDisbursed.toFixed(2)), type: "outflow" },
      { name: "Collected", value: Number((totalCollected + totalInterestCollected).toFixed(2)), type: "inflow" },
      { name: "Expenses", value: Number(totalExpenseAmount.toFixed(2)), type: "outflow" }
    ];

    const velocityMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      velocityMap.set(d.toLocaleDateString('en-US', { month: 'short' }), { lent: 0, collected: 0, interest: 0 });
    }

    loans.forEach(loan => {
      const month = new Date(loan.startDate).toLocaleDateString('en-US', { month: 'short' });
      if (velocityMap.has(month)) velocityMap.get(month)!.lent += Number(loan.principal);
      
      loan.payments.forEach(p => {
        const pMonth = new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short' });
        if (velocityMap.has(pMonth)) {
          velocityMap.get(pMonth)!.collected += Number(p.principalPortion);
          velocityMap.get(pMonth)!.interest += Number(p.interestPortion);
        }
      });
    });

    const velocityData = Array.from(velocityMap.entries()).map(([month, data]) => ({
      month, lent: Number(data.lent.toFixed(2)), collected: Number(data.collected.toFixed(2)), interest: Number(data.interest.toFixed(2))
    }));

    // 🚀 90-DAY MATRIX ENGINE (FULLY RESTORED & CONNECTED)
    const cashFlowVelocityMap = new Map<string, { capitalIn: number, capitalOut: number }>();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    for (let i = 12; i >= 0; i--) {
      const weekLabel = `W${13 - i}`;
      cashFlowVelocityMap.set(weekLabel, { capitalIn: 0, capitalOut: 0 });
    }

    ledgers.forEach(l => {
      const lDate = new Date(l.createdAt);
      if (lDate >= ninetyDaysAgo) {
        const daysDiff = Math.floor((today.getTime() - lDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = 13 - Math.floor(daysDiff / 7);
        const weekLabel = `W${Math.max(1, Math.min(13, weekIndex))}`;

        if (!cashFlowVelocityMap.has(weekLabel)) {
           cashFlowVelocityMap.set(weekLabel, { capitalIn: 0, capitalOut: 0 });
        }

        const entry = cashFlowVelocityMap.get(weekLabel)!;
        if (l.debitAccount === "Vault Cash") entry.capitalIn += Number(l.amount);
        if (l.creditAccount === "Vault Cash") entry.capitalOut += Number(l.amount);
      }
    });

    const cashFlowVelocityData = Array.from(cashFlowVelocityMap.entries()).map(([week, data]) => ({
      week,
      capitalIn: Number(data.capitalIn.toFixed(2)),
      capitalOut: Number(data.capitalOut.toFixed(2))
    }));

    const healthCounts = { paid: 0, pending: 0, late: 0 };
    const healthAmounts = { paid: 0, pending: 0, late: 0 };

    loans.forEach(l => l.installments.forEach(i => {
      const amt = Number(i.expectedAmount);
      if (i.status === 'PAID') { healthCounts.paid++; healthAmounts.paid += amt; }
      else if (i.status === 'LATE' || i.status === 'MISSED') { healthCounts.late++; healthAmounts.late += amt; }
      else { healthCounts.pending++; healthAmounts.pending += amt; }
    }));

    const portfolioHealthData = [
      { name: "Paid", value: healthCounts.paid, amount: healthAmounts.paid, color: "#34d399" },
      { name: "Pending", value: healthCounts.pending, amount: healthAmounts.pending, color: "#fbbf24" },
      { name: "Late/Missed", value: healthCounts.late, amount: healthAmounts.late, color: "#fb7185" }
    ].filter(d => d.value > 0);

    return NextResponse.json({
      portfolio, liquidityData, cashFlowData, portfolioHealthData, velocityData, cashFlowVelocityData,
      summary: { currentVaultCash, outstandingPrincipal, totalDeposits, totalWithdrawals, totalDisbursed, totalCollected, totalInterestCollected, totalExpenseAmount, activeLoans, totalClients, avgLoanSize },
      enterpriseKPIs: { capitalUtilizationRatio, costToIncomeRatio, portfolioAtRisk, activeDisbursedPrincipal, loansAtRiskCount },
      rciMetrics: { netInterestMargin, atRiskCapital: portfolioAtRisk, penaltyRevenue, lateInstallmentsCount }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
