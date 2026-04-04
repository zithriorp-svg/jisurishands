import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST: Settle and payout agent commissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    // Get all pending commissions for this agent
    const pendingCommissions = await prisma.agentCommission.findMany({
      where: {
        agentId,
        isPaidOut: false
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            portfolio: true
          }
        }
      }
    });

    if (pendingCommissions.length === 0) {
      return NextResponse.json({ error: "No pending commissions to settle" }, { status: 400 });
    }

    const totalPayout = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update all commissions to paid out
      await tx.agentCommission.updateMany({
        where: {
          agentId,
          isPaidOut: false
        },
        data: {
          isPaidOut: true
        }
      });

      // Log the withdrawal from Vault Cash as commission expense
      await tx.capitalTransaction.create({
        data: {
          amount: totalPayout,
          type: "WITHDRAWAL",
          description: `Agent Commission Payout: ${pendingCommissions[0].agent.name}`,
          portfolio: pendingCommissions[0].agent.portfolio
        }
      });

      // Create ledger entry for the expense
      await tx.ledger.create({
        data: {
          debitAccount: "Commission Expense",
          creditAccount: "Vault Cash",
          amount: totalPayout,
          transactionType: `Agent Payout: ${pendingCommissions[0].agent.name}`,
          portfolio: pendingCommissions[0].agent.portfolio
        }
      });
    });

    return NextResponse.json({
      success: true,
      settledCount: pendingCommissions.length,
      totalPayout
    });
  } catch (error) {
    console.error("Error settling commissions:", error);
    return NextResponse.json({ error: "Failed to settle commissions" }, { status: 500 });
  }
}
