import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

// I.C.D.R.S. Phase 2: 1-Click Fast-Track Disbursement
// Instantly creates a standard micro-loan for Prime clients

const STANDARD_MICRO_PRINCIPAL = 5000;
const STANDARD_INTEREST_RATE = 6; // 6%
const STANDARD_TERM = 1; // 1 month

export async function POST(request: NextRequest) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    // 1. Verify client exists and is eligible
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        portfolio
      },
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        },
        application: true
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check for active loans (must have 0)
    if (client.loans.length > 0) {
      return NextResponse.json({ error: "Client has active loans" }, { status: 400 });
    }

    // 2. Calculate Vault Cash and Deployable Capital
    const capitalTransactions = await prisma.capitalTransaction.findMany({
      where: { portfolio }
    });
    
    let totalDeposits = 0, totalWithdrawals = 0;
    capitalTransactions.forEach(tx => {
      if (tx.type === "DEPOSIT") totalDeposits += Number(tx.amount);
      else totalWithdrawals += Number(tx.amount);
    });

    const expenses = await prisma.expense.findMany({ where: { portfolio } });
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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

    const ledgers = await prisma.ledger.findMany({ where: { portfolio } });
    let totalDisbursements = 0;
    ledgers.forEach(entry => {
      if (entry.debitAccount === "Loans Receivable") {
        totalDisbursements += Number(entry.amount);
      }
    });

    const vaultCash = totalDeposits - totalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;
    const deployableCapital = vaultCash * 0.85; // 85% safety buffer

    // 3. Safety Lock: Check if disbursement exceeds deployable capital
    if (STANDARD_MICRO_PRINCIPAL > deployableCapital) {
      return NextResponse.json({ 
        error: "Insufficient deployable capital",
        vaultCash,
        deployableCapital,
        required: STANDARD_MICRO_PRINCIPAL
      }, { status: 400 });
    }

    // 4. Create the Fast-Track Loan
    const totalInterest = STANDARD_MICRO_PRINCIPAL * (STANDARD_INTEREST_RATE / 100);
    const totalRepayment = STANDARD_MICRO_PRINCIPAL + totalInterest;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + STANDARD_TERM);

    const loan = await prisma.loan.create({
      data: {
        clientId: client.id,
        principal: STANDARD_MICRO_PRINCIPAL,
        interestRate: STANDARD_INTEREST_RATE,
        termDuration: STANDARD_TERM,
        termType: "Months",
        totalInterest,
        totalRepayment,
        startDate,
        endDate,
        portfolio,
        status: "ACTIVE"
      }
    });

    // 5. Create the single installment (1-month term)
    await prisma.loanInstallment.create({
      data: {
        loanId: loan.id,
        period: 1,
        dueDate: endDate,
        expectedAmount: totalRepayment,
        principal: STANDARD_MICRO_PRINCIPAL,
        interest: totalInterest,
        status: "PENDING"
      }
    });

    // 6. Create Ledger entry AND AuditLog in a transaction
    await prisma.$transaction([
      prisma.ledger.create({
        data: {
          transactionType: "Fast-Track Disbursement",
          amount: STANDARD_MICRO_PRINCIPAL,
          debitAccount: "Loans Receivable",
          creditAccount: "Vault Cash",
          loanId: loan.id,
          portfolio
        }
      }),
      // Immutable Audit Log
      prisma.auditLog.create({
        data: {
          type: "FAST_TRACK",
          amount: STANDARD_MICRO_PRINCIPAL,
          referenceId: loan.id,
          referenceType: "LOAN",
          description: `⚡ FAST-TRACK: ₱${STANDARD_MICRO_PRINCIPAL.toLocaleString()} disbursed to ${client.firstName} ${client.lastName} - TXN-${loan.id.toString().padStart(4, '0')} (Prime client auto-fund)`,
          portfolio
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      loanId: loan.id,
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      principal: STANDARD_MICRO_PRINCIPAL,
      interestRate: STANDARD_INTEREST_RATE,
      totalRepayment,
      dueDate: endDate.toISOString(),
      newVaultCash: vaultCash - STANDARD_MICRO_PRINCIPAL,
      newDeployableCapital: deployableCapital - STANDARD_MICRO_PRINCIPAL
    });

  } catch (error: any) {
    console.error("FAST-TRACK ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
