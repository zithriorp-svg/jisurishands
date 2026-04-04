import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/**
 * G1B: Upsell Opportunity Identifier
 * 
 * Logic: Find clients who have:
 * - Trust Score of 90 or higher
 * - AND currently have 0 Active Loans (or their active loan has Remaining Balance < 15%)
 */
export async function GET() {
  try {
    const portfolio = await getActivePortfolio();

    // Get all clients with their loans and payment data
    const clients = await prisma.client.findMany({
      where: { portfolio },
      include: {
        loans: {
          include: {
            payments: true,
            installments: true
          }
        }
      }
    });

    const upsellCandidates: Array<{
      id: number;
      firstName: string;
      lastName: string;
      phone: string | null;
      trustScore: number;
      activeLoans: number;
      totalOutstanding: number;
      lastLoanDate: Date | null;
    }> = [];

    for (const client of clients) {
      // Calculate Trust Score based on payment behavior
      const allInstallments = client.loans.flatMap(loan => loan.installments);
      const paidInstallments = allInstallments.filter(inst => inst.status === 'PAID' && inst.paymentDate);
      
      let trustScore = 100;
      
      paidInstallments.forEach(inst => {
        const paymentDate = inst.paymentDate ? new Date(inst.paymentDate) : null;
        const dueDate = new Date(inst.dueDate);
        
        if (paymentDate && dueDate) {
          const diffTime = paymentDate.getTime() - dueDate.getTime();
          const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysDiff > 0) {
            trustScore -= (daysDiff * 5);
          } else {
            trustScore += 2;
          }
        }
      });
      
      trustScore = Math.max(0, Math.min(100, trustScore));

      // Only consider clients with Trust Score >= 90
      if (trustScore < 90) continue;

      // Calculate active loans and outstanding balances
      let activeLoansCount = 0;
      let totalOutstanding = 0;
      let lastLoanDate: Date | null = null;

      for (const loan of client.loans) {
        const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remainingBalance = Number(loan.totalRepayment) - totalPaid;
        
        // Check if loan is active (not fully paid)
        if (remainingBalance > 0) {
          activeLoansCount++;
          totalOutstanding += remainingBalance;
        }

        // Track last loan date
        if (!lastLoanDate || new Date(loan.startDate) > lastLoanDate) {
          lastLoanDate = loan.startDate;
        }
      }

      // Check eligibility criteria:
      // 1. No active loans, OR
      // 2. Active loan(s) with remaining balance < 15% of original principal
      let isEligible = false;

      if (activeLoansCount === 0) {
        isEligible = true;
      } else {
        // Check if remaining balance is less than 15% of total principal borrowed
        const totalPrincipal = client.loans.reduce((sum, loan) => sum + Number(loan.principal), 0);
        if (totalPrincipal > 0 && totalOutstanding < totalPrincipal * 0.15) {
          isEligible = true;
        }
      }

      if (isEligible) {
        upsellCandidates.push({
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          trustScore,
          activeLoans: activeLoansCount,
          totalOutstanding,
          lastLoanDate
        });
      }
    }

    // Sort by trust score (highest first), then by last loan date (most recent first)
    upsellCandidates.sort((a, b) => {
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      if (a.lastLoanDate && b.lastLoanDate) {
        return new Date(b.lastLoanDate).getTime() - new Date(a.lastLoanDate).getTime();
      }
      return 0;
    });

    return NextResponse.json({
      portfolio,
      candidates: upsellCandidates.slice(0, 10), // Top 10 candidates
      total: upsellCandidates.length
    });
  } catch (error) {
    console.error('Upsell API error:', error);
    return NextResponse.json({ error: 'Failed to fetch upsell opportunities' }, { status: 500 });
  }
}
