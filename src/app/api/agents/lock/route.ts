import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST: Toggle lock status for an agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, isLocked } = body;

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    if (typeof isLocked !== 'boolean') {
      return NextResponse.json({ error: "isLocked must be a boolean" }, { status: 400 });
    }

    // Update agent lock status
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        isLocked
      }
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        isLocked: updatedAgent.isLocked
      }
    });
  } catch (error) {
    console.error("Error toggling lock status:", error);
    return NextResponse.json({ error: "Failed to toggle lock status" }, { status: 500 });
  }
}
