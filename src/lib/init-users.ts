"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "./auth-utils";

// Check if system needs initialization (no users exist)
export async function checkNeedsInitialization(): Promise<boolean> {
  try {
    const userCount = await prisma.user.count();
    return userCount === 0;
  } catch (e) {
    // Table might not exist yet
    return true;
  }
}

// Auto-seed the master admin and default agent
// CRITICAL: This only works when no users exist (safety check)
export async function initializeMasterAdmin(): Promise<{ 
  success: boolean; 
  error?: string;
  adminUsername?: string;
}> {
  try {
    // SAFETY: Double-check no users exist
    const existingCount = await prisma.user.count();
    if (existingCount > 0) {
      return { 
        success: false, 
        error: "System already initialized. Users exist in database." 
      };
    }

    // Create ADMIN user with master password
    const adminPassword = "Davidcaleb52019***";
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hashPassword(adminPassword),
        role: "ADMIN",
        name: "System Administrator",
      },
    });

    // Create AGENT user for testing
    const agentPassword = "agent123";
    await prisma.user.create({
      data: {
        username: "agent",
        passwordHash: hashPassword(agentPassword),
        role: "AGENT",
        name: "Field Agent",
      },
    });

    console.log(`[AUTO-SEED] Created users: admin (ADMIN), agent (AGENT)`);

    return {
      success: true,
      adminUsername: "admin",
    };
  } catch (error: any) {
    console.error("[AUTO-SEED] Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to initialize users" 
    };
  }
}
