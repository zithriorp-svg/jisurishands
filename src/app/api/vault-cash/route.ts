import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/**
 * G1C: Get current Vault Cash for liquidity check
 * Used by disbursement threshold validation
 */
export async function GET() {
  try {
    const portfolio = await getActivePortfolio();

    // Get all capital transactions
    const capitalTransactions = await prisma.capitalTransaction.findMany({ 
      where: { portfolio } 
    });
    let totalCapitalDeposits = 0, totalCapitalWithdrawals = 0;
    capitalTransactions.forEach(tx => {
      if (tx.type === "DEPOSIT") totalCapitalDeposits += Number(tx.amount);
      else totalCapitalWithdrawals += Number(tx.amount);
    });

    // Get all loans for disbursements
    const ledgers = await prisma.ledger.findMany({ 
      where: { portfolio },
      select: { debitAccount: true, amount: true }
    });
    
    let totalDisbursements = 0;
    ledgers.forEach(entry => {
      if (entry.debitAccount === "Loans Receivable") totalDisbursements += Number(entry.amount);
    });

    // Get all payments
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
    let totalPrincipalCollected = 0, totalInterestCollected = 0;
    payments.forEach(p => {
      totalPrincipalCollected += Number(p.principalPortion);
      totalInterestCollected += Number(p.interestPortion);
    });

    // Get expenses
    const expenses = await prisma.expense.findMany({ 
      where: { portfolio } 
    });
    let totalExpenses = 0;
    expenses.forEach(exp => totalExpenses += Number(exp.amount));

    // Calculate vault cash
    const vaultCash = totalCapitalDeposits - totalCapitalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;

    return NextResponse.json({
      portfolio,
      vaultCash,
      breakdown: {
        totalDeposits: totalCapitalDeposits,
        totalWithdrawals: totalCapitalWithdrawals,
        totalDisbursements,
        totalPrincipalCollected,
        totalInterestCollected,
        totalExpenses
      }
    });
  } catch (error) {
    console.error('Vault cash API error:', error);
    return NextResponse.json({ error: 'Failed to fetch vault cash' }, { status: 500 });
  }
}
