import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const portfolio = await getActivePortfolio();

    // ====== CHART 1: LIQUIDITY TOPOGRAPHY (30-Day Rolling Balance) ======
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Get all capital transactions in last 30 days
    const capitalTransactions = await prisma.capitalTransaction.findMany({
      where: {
        portfolio,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    // Get all loans (disbursements) in last 30 days
    const loans = await prisma.loan.findMany({
      where: {
        portfolio,
        startDate: { gte: thirtyDaysAgo }
      },
      select: { principal: true, startDate: true }
    });

    // Get all payments in last 30 days
    const loanIds = (await prisma.loan.findMany({
      where: { portfolio },
      select: { id: true }
    })).map(l => l.id);

    const payments = await prisma.payment.findMany({
      where: {
        loanId: { in: loanIds },
        paymentDate: { gte: thirtyDaysAgo }
      },
      select: { amount: true, principalPortion: true, interestPortion: true, paymentDate: true }
    });

    // Get manual expenses in last 30 days
    const expenses = await prisma.expense.findMany({
      where: {
        portfolio,
        date: { gte: thirtyDaysAgo }
      },
      select: { amount: true, date: true }
    });

    // 🚀 UPGRADED: Get Agent Commissions from Ledger in last 30 days
    const commissions = await prisma.ledger.findMany({
      where: {
        portfolio,
        debitAccount: "Commission Expense",
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { amount: true, createdAt: true }
    });

    // Build daily liquidity data
    const liquidityData: { date: string; balance: number; inflows: number; outflows: number }[] = [];
    let runningBalance = 0;

    // Calculate starting balance (all transactions before 30 days ago)
    const allCapitalTx = await prisma.capitalTransaction.findMany({ where: { portfolio } });
    const allLoans = await prisma.loan.findMany({ where: { portfolio } });
    const allPayments = await prisma.payment.findMany({ where: { loanId: { in: loanIds } } });
    const allExpenses = await prisma.expense.findMany({ where: { portfolio } });
    const allCommissions = await prisma.ledger.findMany({ 
      where: { portfolio, debitAccount: "Commission Expense" } 
    });

    // Initial vault = deposits - withdrawals - disbursements + collections - manual expenses - commissions
    allCapitalTx.forEach(tx => {
      if (new Date(tx.date) < thirtyDaysAgo) {
        runningBalance += tx.type === "DEPOSIT" ? Number(tx.amount) : -Number(tx.amount);
      }
    });

    allLoans.forEach(loan => {
      if (new Date(loan.startDate) < thirtyDaysAgo) {
        runningBalance -= Number(loan.principal);
      }
    });

    allPayments.forEach(p => {
      if (new Date(p.paymentDate) < thirtyDaysAgo) {
        runningBalance += Number(p.amount);
      }
    });

    allExpenses.forEach(exp => {
      if (new Date(exp.date) < thirtyDaysAgo) {
        runningBalance -= Number(exp.amount);
      }
    });

    allCommissions.forEach(comm => {
      if (new Date(comm.createdAt) < thirtyDaysAgo) {
        runningBalance -= Number(comm.amount);
      }
    });

    // Now build daily data for last 30 days
    for (let i = 0; i <= 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      let dayInflows = 0;
      let dayOutflows = 0;

      // Capital deposits
      capitalTransactions.forEach(tx => {
        const txDate = new Date(tx.date).toISOString().split('T')[0];
        if (txDate === dateStr) {
          if (tx.type === "DEPOSIT") {
            dayInflows += Number(tx.amount);
          } else {
            dayOutflows += Number(tx.amount);
          }
        }
      });

      // Loan disbursements (outflow)
      loans.forEach(loan => {
        const loanDate = new Date(loan.startDate).toISOString().split('T')[0];
        if (loanDate === dateStr) {
          dayOutflows += Number(loan.principal);
        }
      });

      // Payments (inflow)
      payments.forEach(p => {
        const pDate = new Date(p.paymentDate).toISOString().split('T')[0];
        if (pDate === dateStr) {
          dayInflows += Number(p.amount);
        }
      });

      // Manual Expenses (outflow)
      expenses.forEach(exp => {
        const expDate = new Date(exp.date).toISOString().split('T')[0];
        if (expDate === dateStr) {
          dayOutflows += Number(exp.amount);
        }
      });

      // Agent Commissions (outflow)
      commissions.forEach(comm => {
        const commDate = new Date(comm.createdAt).toISOString().split('T')[0];
        if (commDate === dateStr) {
          dayOutflows += Number(comm.amount);
        }
      });

      runningBalance += dayInflows - dayOutflows;

      liquidityData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: runningBalance,
        inflows: dayInflows,
        outflows: dayOutflows
      });
    }

    // ====== CHART 2: CASH FLOW PIPELINE ======
    const totalDeposits = allCapitalTx
      .filter(tx => tx.type === "DEPOSIT")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalWithdrawals = allCapitalTx
      .filter(tx => tx.type === "WITHDRAWAL")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalDisbursed = allLoans.reduce((sum, loan) => sum + Number(loan.principal), 0);

    const totalCollected = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPrincipalCollected = allPayments.reduce((sum, p) => sum + Number(p.principalPortion), 0);
    const totalInterestCollected = allPayments.reduce((sum, p) => sum + Number(p.interestPortion), 0);

    const manualExpenseAmount = allExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const commissionExpenseAmount = allCommissions.reduce((sum, comm) => sum + Number(comm.amount), 0);
    
    // 🚀 UPGRADED: Total Expenses now mathematically includes Agent Commissions
    const totalExpenseAmount = manualExpenseAmount + commissionExpenseAmount;

    const currentVaultCash = totalDeposits - totalWithdrawals - totalDisbursed + totalCollected - totalExpenseAmount;
    const outstandingPrincipal = totalDisbursed - totalPrincipalCollected;

    const cashFlowData = [
      { name: 'Capital In', value: totalDeposits, type: 'inflow' },
      { name: 'Withdrawals', value: totalWithdrawals, type: 'outflow' },
      { name: 'Vault Cash', value: currentVaultCash, type: 'balance' },
      { name: 'Disbursed', value: totalDisbursed, type: 'outflow' },
      { name: 'Collected', value: totalCollected, type: 'inflow' },
      { name: 'Expenses', value: totalExpenseAmount, type: 'outflow' }
    ];

    // ====== CHART 3: PORTFOLIO HEALTH (Installment Status) ======
    const installments = await prisma.loanInstallment.findMany({
      where: {
        loan: { portfolio }
      },
      select: { status: true, expectedAmount: true, amountPaid: true }
    });

    const paidInstallments = installments.filter(i => i.status === 'PAID');
    const pendingInstallments = installments.filter(i => i.status === 'PENDING');
    const lateInstallments = installments.filter(i => i.status === 'LATE' || i.status === 'MISSED');
    const partialInstallments = installments.filter(i => i.status === 'PARTIAL');

    const portfolioHealthData = [
      { name: 'Paid', value: paidInstallments.length, amount: paidInstallments.reduce((s, i) => s + Number(i.amountPaid), 0), color: '#10b981' },
      { name: 'Pending', value: pendingInstallments.length, amount: pendingInstallments.reduce((s, i) => s + Number(i.expectedAmount), 0), color: '#eab308' },
      { name: 'Late', value: lateInstallments.length, amount: lateInstallments.reduce((s, i) => s + Number(i.expectedAmount), 0), color: '#ef4444' },
      { name: 'Partial', value: partialInstallments.length, amount: partialInstallments.reduce((s, i) => s + Number(i.expectedAmount) - Number(i.amountPaid), 0), color: '#f97316' }
    ].filter(d => d.value > 0);

    // ====== CHART 4: VELOCITY - LENT VS COLLECTED (6 Months) ======
    const velocityData: { month: string; lent: number; collected: number; interest: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

      // Loans disbursed this month
      const monthLoans = await prisma.loan.findMany({
        where: {
          portfolio,
          startDate: { gte: monthStart, lte: monthEnd }
        },
        select: { principal: true }
      });
      const monthLent = monthLoans.reduce((sum, l) => sum + Number(l.principal), 0);

      // Payments collected this month
      const monthPayments = await prisma.payment.findMany({
        where: {
          loanId: { in: loanIds },
          paymentDate: { gte: monthStart, lte: monthEnd }
        },
        select: { principalPortion: true, interestPortion: true }
      });
      const monthCollected = monthPayments.reduce((sum, p) => sum + Number(p.principalPortion), 0);
      const monthInterest = monthPayments.reduce((sum, p) => sum + Number(p.interestPortion), 0);

      velocityData.push({
        month: monthName,
        lent: monthLent,
        collected: monthCollected,
        interest: monthInterest
      });
    }

    // ====== CHART 5: CASH FLOW VELOCITY (90 Days Weekly) ======
    const cashFlowVelocityData: { week: string; capitalOut: number; capitalIn: number }[] = [];
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    // Aggregate by week for last 90 days
    for (let week = 0; week < 13; week++) {
      const weekStart = new Date(ninetyDaysAgo);
      weekStart.setDate(ninetyDaysAgo.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekLabel = `W${week + 1}`;

      // Capital Out: Loans disbursed this week
      const weekLoans = await prisma.loan.findMany({
        where: {
          portfolio,
          startDate: { gte: weekStart, lte: weekEnd }
        },
        select: { principal: true }
      });
      const capitalOut = weekLoans.reduce((sum, l) => sum + Number(l.principal), 0);

      // Capital In: Payments collected this week (principal + interest)
      const weekPayments = await prisma.payment.findMany({
        where: {
          loanId: { in: loanIds },
          paymentDate: { gte: weekStart, lte: weekEnd }
        },
        select: { amount: true }
      });
      const capitalIn = weekPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      cashFlowVelocityData.push({
        week: weekLabel,
        capitalOut,
        capitalIn
      });
    }

    // ====== SUMMARY STATS ======
    const activeLoans = await prisma.loan.count({
      where: { portfolio, status: 'ACTIVE' }
    });

    const totalClients = await prisma.client.count({
      where: { portfolio }
    });

    const avgLoanSize = totalDisbursed / (activeLoans || 1);

    // ====== O1A: ENTERPRISE KPI METRICS ======
    
    // KPI 1: Capital Utilization Ratio
    // (Total Active Disbursed Principal / Total Capital Deposits) * 100
    const activeLoansData = await prisma.loan.findMany({
      where: { portfolio, status: 'ACTIVE' },
      select: { principal: true, payments: { select: { principalPortion: true } } }
    });
    
    const activeDisbursedPrincipal = activeLoansData.reduce((sum, loan) => {
      const paidPrincipal = loan.payments.reduce((pSum, p) => pSum + Number(p.principalPortion), 0);
      return sum + (Number(loan.principal) - paidPrincipal);
    }, 0);
    
    const capitalUtilizationRatio = totalDeposits > 0 
      ? (activeDisbursedPrincipal / totalDeposits) * 100 
      : 0;

    // KPI 2: Cost-to-Income Ratio (CIR)
    // (Total Operating Expenses / Total Interest Income) * 100
    const costToIncomeRatio = totalInterestCollected > 0 
      ? (totalExpenseAmount / totalInterestCollected) * 100 
      : 0;

    // KPI 3: Portfolio at Risk (PAR)
    // Sum of outstanding principal of loans that have at least one LATE installment
    const lateInstallmentsForPAR = await prisma.loanInstallment.findMany({
      where: {
        status: { in: ['LATE', 'MISSED'] },
        loan: { portfolio }
      },
      select: { loanId: true }
    });
    
    const loansWithLateInstallments = [...new Set(lateInstallmentsForPAR.map(i => i.loanId))];
    
    const loansAtRisk = await prisma.loan.findMany({
      where: {
        id: { in: loansWithLateInstallments }
      },
      include: {
        payments: { select: { principalPortion: true } }
      }
    });
    
    const portfolioAtRisk = loansAtRisk.reduce((sum, loan) => {
      const paidPrincipal = loan.payments.reduce((pSum, p) => pSum + Number(p.principalPortion), 0);
      const outstandingPrincipal = Number(loan.principal) - paidPrincipal;
      return sum + outstandingPrincipal;
    }, 0);

    // ====== RCI: REVENUE & COLLECTIONS INTELLIGENCE METRICS ======
    
    // RCI 1: Net Interest Margin (NIM)
    // Total Interest Collected - Total Operating Expenses
    const netInterestMargin = totalInterestCollected - totalExpenseAmount;
    
    // RCI 2: At-Risk Capital
    // Sum of expectedAmount for LATE installments
    const lateInstallmentsForRCI = await prisma.loanInstallment.findMany({
      where: {
        status: { in: ['LATE', 'MISSED'] },
        loan: { portfolio }
      },
      select: { expectedAmount: true, principal: true }
    });
    
    const atRiskCapital = lateInstallmentsForRCI.reduce((sum, inst) => {
      return sum + Number(inst.principal); // Principal at risk
    }, 0);
    
    // RCI 3: Penalty Revenue
    // Sum of all penaltyFee amounts
    const allInstallmentsForPenalty = await prisma.loanInstallment.findMany({
      where: { loan: { portfolio } },
      select: { penaltyFee: true }
    });
    
    const penaltyRevenue = allInstallmentsForPenalty.reduce((sum, inst) => {
      return sum + Number(inst.penaltyFee || 0);
    }, 0);

    return NextResponse.json({
      portfolio,
      liquidityData,
      cashFlowData,
      portfolioHealthData,
      velocityData,
      cashFlowVelocityData,
      summary: {
        currentVaultCash,
        outstandingPrincipal,
        totalDeposits,
        totalWithdrawals,
        totalDisbursed,
        totalCollected,
        totalInterestCollected,
        totalExpenseAmount,
        activeLoans,
        totalClients,
        avgLoanSize
      },
      enterpriseKPIs: {
        capitalUtilizationRatio,
        costToIncomeRatio,
        portfolioAtRisk,
        activeDisbursedPrincipal,
        loansAtRiskCount: loansWithLateInstallments.length
      },
      rciMetrics: {
        netInterestMargin,
        atRiskCapital,
        penaltyRevenue,
        lateInstallmentsCount: lateInstallmentsForRCI.length
      }
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
