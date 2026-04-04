"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from 'next/cache';
import { cookies } from "next/headers";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function getActivePortfolio() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;
}

interface PaymentScheduleItem {
  periodNumber: number;
  paymentDate: Date;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

interface DirectDisbursementData {
  clientId: number;
  principal: number;
  interestRate: number;
  termDuration: number;
  termType: "Days" | "Weeks" | "Months";
  totalInterest: number;
  totalRepayment: number;
  schedule: PaymentScheduleItem[];
  agentId?: number | null;
}

// ==========================================
// LOAN DISBURSEMENT ENGINE
// ==========================================
export async function disburseDirectLoan(data: DirectDisbursementData) {
  try {
    const portfolio = await getActivePortfolio();
    
    // 1. Verify the client exists and belongs to this portfolio
    const client = await prisma.client.findFirst({
      where: { 
        id: data.clientId,
        portfolio 
      }
    });

    if (!client) {
      return { error: "Client not found in this portfolio" };
    }

    // 2. Calculate start and end dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    switch (data.termType) {
      case "Days":
        endDate.setDate(endDate.getDate() + data.termDuration);
        break;
      case "Weeks":
        endDate.setDate(endDate.getDate() + (data.termDuration * 7));
        break;
      case "Months":
        endDate.setMonth(endDate.getMonth() + data.termDuration);
        break;
    }

    // 3. Create the Loan record with portfolio
    const loan = await prisma.loan.create({
      data: {
        clientId: client.id,
        principal: data.principal,
        interestRate: data.interestRate,
        termDuration: data.termDuration,
        termType: data.termType,
        totalInterest: data.totalInterest,
        totalRepayment: data.totalRepayment,
        startDate: startDate,
        endDate: endDate,
        portfolio,
        status: "ACTIVE",
        agentId: data.agentId || null
      }
    });

    // 4. Create the LoanInstallment records
    const disbursementDate = new Date();
    
    for (const scheduleItem of data.schedule) {
      const dueDate = new Date(disbursementDate);
      
      switch (data.termType) {
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

    // 5. Create the Ledger entry for disbursement (deduct from Vault Cash)
    await prisma.ledger.create({
      data: {
        transactionType: "Loan Disbursement",
        amount: data.principal,
        debitAccount: "Loans Receivable",
        creditAccount: "Vault Cash",
        loanId: loan.id,
        portfolio
      }
    });

    // 🚀 INJECT: SYSTEM BOT SENDS MESSAGE TO COMM-LINK
    await prisma.message.create({
      data: {
        clientId: client.id,
        sender: "VAULT SYSTEM",
        text: `💸 LOAN DISBURSED: TXN-${loan.id.toString().padStart(4, '0')} for ₱${data.principal.toLocaleString('en-US', {minimumFractionDigits: 2})} has been officially approved and deployed. Please refer to your Amortization Schedule for due dates.`
      }
    });

    // 6. Revalidate paths to refresh UI
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath(`/clients/${client.id}`);
    revalidatePath("/clients");

    return { 
      success: true, 
      loanId: loan.id, 
      clientId: client.id,
      message: `Loan #${loan.id} successfully disbursed to ${client.firstName} ${client.lastName}`
    };

  } catch (error: any) {
    console.error("DIRECT DISBURSEMENT ERROR:", error);
    return { error: error.message || "Failed to disburse loan" };
  }
}

// ==========================================
// 🚀 3-WAY SECURE COMM-LINK ENGINE
// ==========================================
export async function sendChatMessage(clientId: number, text: string) {
  if (!text || text.trim() === "") return { error: "Message cannot be empty." };

  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get("user_role")?.value || "CLIENT"; 
    const userName = cookieStore.get("user_name")?.value || "Unknown";

    // Determine the sender tag
    let sender = "CLIENT";
    if (userRole === "ADMIN") {
      sender = "ADMIN";
    } else if (userRole === "AGENT") {
      sender = `AGENT (${userName})`;
    }

    await prisma.message.create({
      data: {
        clientId,
        sender,
        text: text.trim(),
      },
    });

    // Force Next.js to refresh the client profile page to show the new message
    revalidatePath(`/clients/${clientId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error("Chat Error:", error);
    return { error: "Failed to send message." };
  }
}
