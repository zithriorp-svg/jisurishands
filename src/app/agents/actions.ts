"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function getActivePortfolio() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;
}

// ==========================================
// 💥 AGENT ERADICATION PROTOCOL
// ==========================================
export async function deleteAgentRecord(agentId: number) {
  try {
    const portfolio = await getActivePortfolio();

    // 1. Verify the agent exists
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, portfolio }
    });

    if (!agent) {
      return { error: "Agent not found or unauthorized." };
    }

    // 2. SURGICAL STRIKE: Unlink Agent from all loans. 
    // We DO NOT delete the loans because the client still owes the House.
    if (prisma.loan) {
      await prisma.loan.updateMany({
        where: { agentId: agentId },
        data: { agentId: null }
      }).catch(()=>{});
    }

    // 3. Vaporize all Commission Ledgers for this agent
    if (prisma.agentCommission) {
      await prisma.agentCommission.deleteMany({
        where: { agentId: agentId }
      }).catch(()=>{});
    }

    // 4. Finally, eradicate the Agent profile
    await prisma.agent.delete({
      where: { id: agentId }
    });

    // Refresh UI
    revalidatePath("/agents");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("AGENT ERADICATION ERROR:", error);
    return { error: error.message || "Failed to delete agent record." };
  }
}

