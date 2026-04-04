import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

// GET: List all agents with their stats
export async function GET() {
  try {
    const portfolio = await getActivePortfolio();

    const agents = await prisma.agent.findMany({
      where: { portfolio },
      include: {
        loans: {
          where: { status: "ACTIVE" },
          select: { id: true, principal: true }
        },
        commissions: {
          where: { isPaidOut: false }
        }
      },
      orderBy: { name: 'asc' }
    });

    const agentsWithStats = agents.map(agent => {
      const activeLoans = agent.loans.length;
      const totalExposure = agent.loans.reduce((sum, loan) => sum + Number(loan.principal), 0);
      const pendingCommission = agent.commissions.reduce((sum, c) => sum + Number(c.amount), 0);

      return {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        activeLoans,
        totalExposure,
        pendingCommission,
        commissionsCount: agent.commissions.length
      };
    });

    return NextResponse.json({ agents: agentsWithStats, portfolio });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

// POST: Create a new agent
export async function POST(request: NextRequest) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await request.json();
    const { name, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || "",
        portfolio
      }
    });

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
