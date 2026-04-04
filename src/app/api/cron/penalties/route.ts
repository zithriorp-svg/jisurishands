import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Find all ACTIVE loans that still have the 4% discount, 
    // BUT missed a payment yesterday (dueDate is less than today and still PENDING/PARTIAL)
    const delinquentLoans = await prisma.loan.findMany({
      where: {
        status: "ACTIVE",
        goodPayerDiscountRevoked: false,
        installments: {
          some: {
            status: { in: ["PENDING", "PARTIAL"] },
            dueDate: { lt: now }
          }
        }
      },
      include: {
        installments: true 
      }
    });

    let revokedCount = 0;

    for (const loan of delinquentLoans) {
      // 2. Officially revoke the discount in the database
      await prisma.loan.update({
        where: { id: loan.id },
        data: { goodPayerDiscountRevoked: true }
      });

      // 3. Calculate the math difference (10% standard vs 6% discounted)
      const principal = Number(loan.principal);
      const newInterestTotal = principal * 0.10; // Bump to 10%
      const newInterestPerPeriod = newInterestTotal / loan.termDuration;
      const principalPerPeriod = principal / loan.termDuration;
      const newExpectedAmount = principalPerPeriod + newInterestPerPeriod;

      // 4. Apply the exact difference to all unpaid installments
      const pendingInstallments = loan.installments.filter(i => 
        i.status === "PENDING" || i.status === "LATE" || i.status === "PARTIAL" || i.status === "MISSED"
      );

      for (const inst of pendingInstallments) {
        const difference = newExpectedAmount - Number(inst.expectedAmount);
        
        // Mark the specific missed installment as LATE
        const instDueDate = new Date(inst.dueDate);
        instDueDate.setHours(0, 0, 0, 0);
        const newStatus = (instDueDate < now && inst.status === "PENDING") ? "LATE" : inst.status;

        await prisma.loanInstallment.update({
          where: { id: inst.id },
          data: { 
            penaltyFee: { increment: difference },
            status: newStatus
          }
        });
      }

      // 5. Create an immutable Audit Log for the House
      await prisma.auditLog.create({
        data: {
          type: 'PENALTY',
          amount: newInterestTotal - (principal * 0.06), // The exact penalty value gained
          referenceId: loan.id,
          referenceType: 'LOAN',
          description: 'AUTO-CRON: 4% Good Payer Discount REVOKED due to delinquency.',
          portfolio: loan.portfolio
        }
      });

      // 6. 🚀 INJECT: SYSTEM BOT SENDS MESSAGE TO COMM-LINK
      await prisma.message.create({
        data: {
          clientId: loan.clientId,
          sender: "VAULT SYSTEM (AUTO)",
          text: `⚠️ CONTRACT ENFORCEMENT: Your 4% Good Payer Discount has been permanently REVOKED due to delinquent payment on TXN-${loan.id.toString().padStart(4, '0')}. Your interest rate is now locked at the standard 10%.`
        }
      });

      revokedCount++;
    }

    console.log(`[CRON] Penalty Engine executed. Revoked discount for ${revokedCount} delinquent loans.`);

    return NextResponse.json({
      success: true,
      message: `Penalty scan complete. Revoked discount for ${revokedCount} delinquent loans.`
    });

  } catch (error: any) {
    console.error("[CRON] Penalty Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Allow POST requests for manual test triggers
export async function POST(request: Request) {
  return GET(request);
}

