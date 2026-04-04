import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

interface PaymentScheduleItem {
  periodNumber: number;
  paymentDate: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

export async function POST(request: NextRequest) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await request.json();
    
    const { 
      clientId, 
      principal, 
      interestRate, 
      termDuration, 
      termType, 
      totalInterest, 
      totalRepayment, 
      schedule,
      agentId 
    } = body as {
      clientId: number;
      principal: number;
      interestRate: number;
      termDuration: number;
      termType: "Days" | "Weeks" | "Months";
      totalInterest: number;
      totalRepayment: number;
      schedule: PaymentScheduleItem[];
      agentId?: number | null;
    };

    // 1. Verify the client exists and belongs to this portfolio
    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        portfolio 
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found in this portfolio" }, { status: 404 });
    }

    // G1C: LIQUIDITY SAFETY CHECK - Verify sufficient vault cash
    const capitalTransactions = await prisma.capitalTransaction.findMany({ 
      where: { portfolio } 
    });
    let totalCapitalDeposits = 0, totalCapitalWithdrawals = 0;
    capitalTransactions.forEach(tx => {
      if (tx.type === "DEPOSIT") totalCapitalDeposits += Number(tx.amount);
      else totalCapitalWithdrawals += Number(tx.amount);
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

    const expenses = await prisma.expense.findMany({ 
      where: { portfolio } 
    });
    let totalExpenses = 0;
    expenses.forEach(exp => totalExpenses += Number(exp.amount));

    const vaultCash = totalCapitalDeposits - totalCapitalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;

    if (principal > vaultCash) {
      return NextResponse.json({ 
        error: `INSUFFICIENT VAULT LIQUIDITY. Required: ₱${principal.toLocaleString()}, Available: ₱${vaultCash.toLocaleString()}.`,
        vaultCash,
        requested: principal
      }, { status: 400 });
    }

    // 2. Calculate start and end dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    switch (termType) {
      case "Days":
        endDate.setDate(endDate.getDate() + termDuration);
        break;
      case "Weeks":
        endDate.setDate(endDate.getDate() + (termDuration * 7));
        break;
      case "Months":
        endDate.setMonth(endDate.getMonth() + termDuration);
        break;
    }

    // 3. Create the Loan record with portfolio
    const loan = await prisma.loan.create({
      data: {
        clientId: client.id,
        principal: principal,
        interestRate: interestRate,
        termDuration: termDuration,
        termType: termType,
        totalInterest: totalInterest,
        totalRepayment: totalRepayment,
        startDate: startDate,
        endDate: endDate,
        portfolio,
        status: "ACTIVE"
      }
    });

    // 4. Create the LoanInstallment records
    const disbursementDate = new Date();
    
    for (const scheduleItem of schedule) {
      const dueDate = new Date(disbursementDate);
      
      switch (termType) {
        case "Days":
          dueDate.setDate(dueDate.getDate() + scheduleItem.periodNumber);
          break;
        case "Weeks":
          dueDate.setDate(dueDate.getDate() + (scheduleItem.periodNumber * 7));
          break;
        case "Months":
          dueDate.setMonth(dueDate.getMonth() + scheduleItem.periodNumber);
          break;
      }

      await prisma.loanInstallment.create({
        data: {
          loanId: loan.id,
          period: scheduleItem.periodNumber,
          dueDate: dueDate,
          expectedAmount: scheduleItem.amount,
          principal: scheduleItem.principalPortion,
          interest: scheduleItem.interestPortion,
          status: "PENDING"
        }
      });
    }

    // 5. Create the Ledger entry AND AuditLog in a transaction
    await prisma.$transaction([
      prisma.ledger.create({
        data: {
          transactionType: "Loan Disbursement",
          amount: principal,
          debitAccount: "Loans Receivable",
          creditAccount: "Vault Cash",
          loanId: loan.id,
          portfolio
        }
      }),
      // Immutable Audit Log
      prisma.auditLog.create({
        data: {
          type: "DISBURSEMENT",
          amount: principal,
          referenceId: loan.id,
          referenceType: "LOAN",
          agentId: agentId || null,
          description: `Direct disbursement to ${client.firstName} ${client.lastName} - TXN-${loan.id.toString().padStart(4, '0')} (${termDuration} ${termType.toLowerCase()}, ${interestRate}% interest)`,
          portfolio
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      loanId: loan.id, 
      clientId: client.id,
      message: `Loan #${loan.id} successfully disbursed to ${client.firstName} ${client.lastName}`
    });

  } catch (error: any) {
    console.error("DIRECT DISBURSEMENT ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to disburse loan" }, { status: 500 });
  }
}
