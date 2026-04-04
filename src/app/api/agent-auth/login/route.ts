import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * AGENT PORTAL LOGIN
 * Validates username and PIN against Agent table
 * Blocks access if agent is locked
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const username = formData.get("username") as string;
  const pin = formData.get("pin") as string;

  if (!username || !pin) {
    return NextResponse.redirect(new URL("/agent-portal?error=missing", req.url));
  }

  // Validate PIN format (exactly 6 digits)
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.redirect(new URL("/agent-portal?error=invalid", req.url));
  }

  try {
    // Find agent by username
    const agent = await prisma.agent.findUnique({
      where: { username }
    });

    // Validate agent exists
    if (!agent) {
      return NextResponse.redirect(new URL("/agent-portal?error=invalid", req.url));
    }

    // Check if agent is locked
    if (agent.isLocked) {
      return NextResponse.redirect(new URL("/agent-portal?error=locked", req.url));
    }

    // Validate PIN matches
    if (agent.pin !== pin) {
      return NextResponse.redirect(new URL("/agent-portal?error=invalid", req.url));
    }

    // Set session cookies
    const cookieStore = await cookies();

    cookieStore.set("agent_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax"
    });

    cookieStore.set("agent_id", agent.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax"
    });

    cookieStore.set("agent_name", agent.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax"
    });

    return NextResponse.redirect(new URL("/agent-portal", req.url));
  } catch (error) {
    console.error("Agent login error:", error);
    return NextResponse.redirect(new URL("/agent-portal?error=server", req.url));
  }
}
