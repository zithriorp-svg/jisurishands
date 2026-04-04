"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
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

interface LoanDisbursementData {
  applicationId: number;
  principal: number;
  interestRate: number;
  termDuration: number;
  termType: "Days" | "Weeks" | "Months";
  totalInterest: number;
  totalRepayment: number;
  schedule: PaymentScheduleItem[];
  agentId?: number | null;
}

export async function disburseLoan(data: LoanDisbursementData) {
  try {
    const portfolio = await getActivePortfolio();
    
    // 1. Fetch the current application
    const currentApp = await prisma.application.findFirst({
      where: { 
        id: data.applicationId,
        portfolio 
      }
    });

    if (!currentApp) {
      return { error: "Application not found in this portfolio" };
    }

    // 2. Create or find the client (within same portfolio)
    let client = await prisma.client.findFirst({
      where: {
        firstName: currentApp.firstName,
        lastName: currentApp.lastName,
        portfolio
      }
    });

    if (!client) {
      // Create new client with portfolio - COPY SIGNATURE FROM APPLICATION
      client = await prisma.client.create({
        data: {
          firstName: currentApp.firstName || "Unknown",
          lastName: currentApp.lastName || "Unknown",
          phone: currentApp.phone || null,
          address: currentApp.address || null,
          digitalSignature: currentApp.digitalSignature, // CRITICAL: Carry over signature
          applicationId: data.applicationId,
          portfolio
        }
      });
    } else {
      // Update existing client to link application AND copy signature if missing
      const updateData: any = {};
      if (!client.applicationId) {
        updateData.applicationId = data.applicationId;
      }
      // If client has no signature but application does, copy it
      if (!client.digitalSignature && currentApp.digitalSignature) {
        updateData.digitalSignature = currentApp.digitalSignature;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.client.update({
          where: { id: client.id },
          data: updateData
        });
      }
    }

    // 3. Calculate start and end dates
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

    // 4. Create the Loan record with portfolio and collateral
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
        agentId: data.agentId || null,
        // Copy collateral fields from application
        collateralName: currentApp.collateralName || null,
        collateralDescription: currentApp.collateralDescription || null,
        collateralDefects: currentApp.collateralDefects || null
      }
    });

    // 5. 🚀 CALENDAR OVERRIDE: Create the LoanInstallment records with Ironclad Server Math
    const disbursementDate = new Date();
    
    // We use the index `i` of the loop to force perfect chronological spacing, ignoring frontend glitches
    for (let i = 0; i < data.schedule.length; i++) {
      const scheduleItem = data.schedule[i];
      const truePeriodNumber = i + 1; 
      const dueDate = new Date(disbursementDate);
      
      switch (data.termType) {
        case "Days":
          dueDate.setDate(dueDate.getDate() + truePeriodNumber);
          break;
        case "Weeks":
          dueDate.setDate(dueDate.getDate() + (truePeriodNumber * 7));
          break;
        case "Months":
          dueDate.setMonth(dueDate.getMonth() + truePeriodNumber);
          break;
      }

      await prisma.loanInstallment.create({
        data: {
          loanId: loan.id,
          period: truePeriodNumber,
          dueDate: dueDate,
          expectedAmount: scheduleItem.amount,
          principal: scheduleItem.principalPortion,
          interest: scheduleItem.interestPortion,
          status: "PENDING"
        }
      });
    }

    // 6. Create the Ledger entry AND AuditLog in a transaction
    await prisma.$transaction([
      // Ledger entry
      prisma.ledger.create({
        data: {
          transactionType: "Loan Disbursement",
          amount: data.principal,
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
          amount: data.principal,
          referenceId: loan.id,
          referenceType: "LOAN",
          agentId: data.agentId || null,
          description: `Principal disbursed to ${client.firstName} ${client.lastName} - TXN-${loan.id.toString().padStart(4, '0')} (${data.termDuration} ${data.termType.toLowerCase()}, ${data.interestRate}% interest)`,
          portfolio
        }
      })
    ]);

    // 7. Update the application status to APPROVED and link to client
    await prisma.application.update({
      where: { id: data.applicationId },
      data: { 
        status: "APPROVED",
        client: { connect: { id: client.id } } // CRITICAL: Link application to client for KYC dossier
      }
    });

    // 8. Revalidate paths
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/clients");

    return { success: true, loanId: loan.id, clientId: client.id };

  } catch (error: any) {
    console.error("DISBURSEMENT ERROR:", error);
    return { error: error.message || "Failed to disburse loan" };
  }
}

export async function rejectApplication(applicationId: number) {
  try {
    const portfolio = await getActivePortfolio();
    
    await prisma.application.updateMany({
      where: { id: applicationId, portfolio },
      data: { status: "REJECTED" }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("REJECT ERROR:", error);
    return { error: error.message || "Failed to reject application" };
  }
}

