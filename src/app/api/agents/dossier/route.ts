import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

// GET: Fetch detailed dossier for a specific agent
export async function GET(request: NextRequest) {
  try {
    const portfolio = await getActivePortfolio();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    // Fetch agent with all relations
    const agent = await prisma.agent.findFirst({
      where: { 
        id: parseInt(agentId),
        portfolio 
      },
      include: {
        loans: {
          where: { status: "ACTIVE" },
          include: {
            client: true,
            installments: {
              where: { status: "PENDING" },
              orderBy: { dueDate: 'asc' },
              take: 1
            }
          }
        },
        commissions: true
      }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Calculate commission stats
    const totalLifetimeEarnings = agent.commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingPayout = agent.commissions
      .filter(c => !c.isPaidOut)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    // Calculate total risk/liability (remaining balance of all active loans)
    let totalRiskLiability = 0;
    const activeClients: Array<{
      loanId: number;
      clientId: number;
      clientName: string;
      originalPrincipal: number;
      remainingBalance: number;
      nextDueDate: string | null;
      nextDueAmount: number | null;
      statusColor: string;
    }> = [];

    for (const loan of agent.loans) {
      // Get all installments for this loan to calculate remaining balance
      const allInstallments = await prisma.loanInstallment.findMany({
        where: { loanId: loan.id }
      });
      
      const totalPrincipal = Number(loan.principal);
      const totalPrincipalPaid = allInstallments
        .filter(i => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.principalPaid), 0);
      
      const remainingBalance = totalPrincipal - totalPrincipalPaid;
      totalRiskLiability += remainingBalance;

      // Get next pending installment
      const nextInstallment = loan.installments.find(i => i.status === "PENDING");
      
      // Determine status color
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let statusColor = "text-zinc-400"; // Default gray
      
      if (nextInstallment) {
        const dueDate = new Date(nextInstallment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          statusColor = "text-rose-500"; // Late - Red
        } else if (dueDate.getTime() === today.getTime()) {
          statusColor = "text-amber-400"; // Due today - Yellow
        }
      }

      activeClients.push({
        loanId: loan.id,
        clientId: loan.client.id,
        clientName: `${loan.client.firstName} ${loan.client.lastName}`,
        originalPrincipal: totalPrincipal,
        remainingBalance,
        nextDueDate: nextInstallment?.dueDate?.toISOString() || null,
        nextDueAmount: nextInstallment ? Number(nextInstallment.expectedAmount) : null,
        statusColor
      });
    }

    const dossier = {
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      createdAt: agent.createdAt.toISOString(),
      portfolio: agent.portfolio,
      // Authentication fields
      username: agent.username,
      pin: agent.pin,
      isLocked: agent.isLocked,
      // Commission stats
      totalLifetimeEarnings,
      pendingPayout,
      commissionsCount: agent.commissions.length,
      pendingCommissionsCount: agent.commissions.filter(c => !c.isPaidOut).length,
      // Risk/Liability
      totalRiskLiability,
      activeLoansCount: agent.loans.length,
      // Active clients
      activeClients
    };

    return NextResponse.json({ dossier });
  } catch (error) {
    console.error("Error fetching agent dossier:", error);
    return NextResponse.json({ error: "Failed to fetch agent dossier" }, { status: 500 });
  }
}
