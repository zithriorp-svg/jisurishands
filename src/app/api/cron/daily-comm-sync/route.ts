import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get all active loans with pending or late installments
    const activeLoans = await prisma.loan.findMany({
      where: { status: 'ACTIVE' },
      include: { 
        installments: { where: { status: { in: ['PENDING', 'LATE', 'MISSED', 'PARTIAL'] } } } 
      }
    });

    let alertsSent = 0;

    for (const loan of activeLoans) {
      let hasOverdue = false;
      let hasDueToday = false;
      let overdueAmount = 0;
      let dueTodayAmount = 0;

      // 2. Scan the radar for this specific loan
      for (const inst of loan.installments) {
        const dueDate = new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) {
          hasOverdue = true;
          overdueAmount += Number(inst.expectedAmount) + Number(inst.penaltyFee || 0);
        } else if (dueDate.getTime() === today.getTime()) {
          hasDueToday = true;
          dueTodayAmount += Number(inst.expectedAmount);
        }
      }

      // 3. ANTI-SPAM LOCK: Check if the Auto-Bot already warned them today
      const startOfDay = new Date(); 
      startOfDay.setHours(0, 0, 0, 0);
      
      const alreadySentToday = await prisma.message.findFirst({
        where: {
          clientId: loan.clientId,
          sender: "VAULT SYSTEM (AUTO)",
          createdAt: { gte: startOfDay }
        }
      });

      // 4. FIRE THE AUTOMATED WEAPON
      if (!alreadySentToday) {
        if (hasOverdue) {
          await prisma.message.create({
            data: {
              clientId: loan.clientId,
              sender: "VAULT SYSTEM (AUTO)",
              text: `🚨 URGENT: You have OVERDUE balances totaling ₱${overdueAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}. Please settle immediately. Failure to pay will result in the permanent revocation of your 4% Good Payer Discount and lock your account at 10% interest.`
            }
          });
          alertsSent++;
        } else if (hasDueToday) {
          await prisma.message.create({
            data: {
              clientId: loan.clientId,
              sender: "VAULT SYSTEM (AUTO)",
              text: `📅 REMINDER: You have a payment of ₱${dueTodayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})} DUE TODAY. Please pay on time to maintain your Prime Borrower status and your 4% Good Payer Discount.`
            }
          });
          alertsSent++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      alertsSent, 
      message: `Ghost Agent scan complete. Fired ${alertsSent} automated Comm-Link warnings.` 
    });

  } catch (error: any) {
    console.error("Ghost Agent Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

