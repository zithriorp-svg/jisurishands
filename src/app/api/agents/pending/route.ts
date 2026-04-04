import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const portfolio = cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;

    const pendingAgents = await prisma.agentApplication.findMany({
      where: { 
        status: "PENDING",
        portfolio: portfolio // 🚀 PERFECT RADAR: Only show pending recruits for the active division!
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: pendingAgents });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch pending agents." }, { status: 500 });
  }
}

// Handle Approve / Reject
export async function POST(req: Request) {
  try {
    const { id, action } = await req.json();
    
    if (action === "REJECT") {
      await prisma.agentApplication.update({ where: { id }, data: { status: "REJECTED" } });
      return NextResponse.json({ success: true });
    }

    if (action === "APPROVE") {
      // 1. Mark application as approved
      const application = await prisma.agentApplication.update({ where: { id }, data: { status: "APPROVED" } });
      
      // 2. Officially create the Agent in the system
      await prisma.agent.create({
        data: {
          name: `${application.firstName} ${application.lastName}`,
          phone: application.phone || "",
          
          // 🚀 CRITICAL FIX: Transfer the exact portfolio tag from the application to the new Agent ID
          portfolio: application.portfolio, 
          
          username: `${application.firstName.toLowerCase()}.${application.lastName.toLowerCase()}`,
          pin: "123456", // Default PIN
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json({ success: false, error: "Failed to process application." }, { status: 500 });
  }
}
