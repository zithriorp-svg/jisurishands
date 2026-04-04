"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function setActivePortfolioCookie(name: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTFOLIO_COOKIE, name, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function switchPortfolioAction(portfolioName: string): Promise<{ success: boolean; error?: string }> {
  try {
    await setActivePortfolioCookie(portfolioName);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function initializeNewYearAction(portfolioName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedName = portfolioName.trim();
    if (!trimmedName) {
      return { success: false, error: "Portfolio name is required" };
    }
    
    // Create the portfolio in the SystemPortfolio table (upsert to handle duplicates)
    await prisma.systemPortfolio.upsert({
      where: { name: trimmedName },
      update: {}, // No update needed if exists
      create: { name: trimmedName }
    });
    
    // Set the active portfolio cookie
    await setActivePortfolioCookie(trimmedName);
    
    // Revalidate all paths to refresh data
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error initializing new year:", error);
    return { success: false, error: error.message };
  }
}

// Ensure default portfolio exists in database
export async function ensureDefaultPortfolio(): Promise<void> {
  try {
    const existing = await prisma.systemPortfolio.findUnique({
      where: { name: DEFAULT_PORTFOLIO }
    });
    
    if (!existing) {
      await prisma.systemPortfolio.create({
        data: { name: DEFAULT_PORTFOLIO }
      });
    }
  } catch (error) {
    console.error("Error ensuring default portfolio:", error);
  }
}
