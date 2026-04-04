import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST: Generate or regenerate credentials for an agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    // Fetch the agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Generate username from name (lowercase, no spaces, unique)
    const baseUsername = agent.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12);

    // Add random suffix to ensure uniqueness
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    let username = `${baseUsername}_${randomSuffix}`;

    // Check if username already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { username }
    });

    if (existingAgent) {
      // Generate a new username with different suffix
      const newSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      username = `${baseUsername}_${newSuffix}`;
    }

    // Generate random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Update agent with credentials
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        username,
        pin
      }
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        username: updatedAgent.username,
        pin: updatedAgent.pin // Only return on generation
      }
    });
  } catch (error) {
    console.error("Error generating credentials:", error);
    return NextResponse.json({ error: "Failed to generate credentials" }, { status: 500 });
  }
}
