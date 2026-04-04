import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// SHA256 password hashing (must match login page)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return NextResponse.redirect(new URL("/login?error=missing", req.url));
  }

  const passwordHash = hashPassword(password);

  try {
    let user = await prisma.user.findUnique({
      where: { username }
    });

    // 🚀 THE AUTO-SYNC GATEWAY: Automatically create the user if they are an authorized agent!
    if (!user) {
      const agent = await prisma.agent.findFirst({
        where: {
          OR: [
            { username: username },
            { name: username }
          ]
        }
      });

      if (agent) {
        user = await prisma.user.create({
          data: {
            username: username,
            passwordHash: passwordHash,
            role: "AGENT",
            name: agent.name
          }
        });
      }
    }

    if (!user || user.passwordHash !== passwordHash) {
      return NextResponse.redirect(new URL("/login?error=invalid", req.url));
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Set session cookies
    const cookieStore = await cookies();
    cookieStore.set("vault_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    cookieStore.set("user_role", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    
    // 🚀 STRICT IDENTITY LOCK: Saves their exact username to pull their specific clients
    cookieStore.set("user_name", user.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.redirect(new URL("/", req.url));
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.redirect(new URL("/login?error=server", req.url));
  }
}

// Initialize Master Admin - creates default admin and agent users
export async function PUT(req: Request) {
  try {
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return NextResponse.json({ error: "Users already exist" }, { status: 400 });
    }

    // Create default admin user
    const adminPasswordHash = hashPassword("Davidcaleb52019***");
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        name: "Master Admin"
      }
    });

    // Create default agent user
    const agentPasswordHash = hashPassword("agent123");
    await prisma.user.create({
      data: {
        username: "agent",
        passwordHash: agentPasswordHash,
        role: "AGENT",
        name: "Field Agent"
      }
    });

    return NextResponse.json({ success: true, message: "Master Admin and Agent users created" });
  } catch (error) {
    console.error("Initialize error:", error);
    return NextResponse.json({ error: "Failed to initialize users" }, { status: 500 });
  }
}
