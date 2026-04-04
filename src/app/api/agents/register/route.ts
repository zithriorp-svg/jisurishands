import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

// POST: Register a reference as a field agent
export async function POST(request: NextRequest) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await request.json();
    const { name, phone, applicationId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    // Check if agent already exists with this phone
    let agent = await prisma.agent.findFirst({
      where: { 
        phone: phone?.trim() || "",
        portfolio 
      }
    });

    if (agent) {
      // Return existing agent
      return NextResponse.json({ 
        success: true, 
        agent,
        message: "Agent already exists with this phone number"
      });
    }

    // Create new agent
    agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || "",
        portfolio
      }
    });

    return NextResponse.json({ 
      success: true, 
      agent,
      message: "Agent registered successfully"
    });
  } catch (error) {
    console.error("Error registering agent:", error);
    return NextResponse.json({ error: "Failed to register agent" }, { status: 500 });
  }
}
