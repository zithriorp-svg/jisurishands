import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const PORTFOLIO_COOKIE = "fintech_portfolio";
export const DEFAULT_PORTFOLIO = "Main Portfolio";

/**
 * Get the currently active portfolio from cookies
 * Defaults to "Main Portfolio" if not set
 */
export async function getActivePortfolio(): Promise<string> {
  const cookieStore = await cookies();
  const portfolio = cookieStore.get(PORTFOLIO_COOKIE)?.value;
  return portfolio || DEFAULT_PORTFOLIO;
}

/**
 * Set the active portfolio in cookies
 */
export async function setActivePortfolio(name: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTFOLIO_COOKIE, name, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });
}

/**
 * Ensure default portfolio exists in database
 */
async function ensureDefaultPortfolio(): Promise<void> {
  const existing = await prisma.systemPortfolio.findUnique({
    where: { name: DEFAULT_PORTFOLIO }
  });
  
  if (!existing) {
    await prisma.systemPortfolio.create({
      data: { name: DEFAULT_PORTFOLIO }
    });
  }
}

/**
 * Get all unique portfolio names from SystemPortfolio table
 * This ensures even empty portfolios show up in the list
 */
export async function getPortfolioList(): Promise<string[]> {
  try {
    // Ensure default portfolio exists
    await ensureDefaultPortfolio();
    
    // Get all portfolios from the dedicated table
    const portfolios = await prisma.systemPortfolio.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    return portfolios.map(p => p.name);
  } catch (error) {
    console.error("Error fetching portfolio list:", error);
    return [DEFAULT_PORTFOLIO];
  }
}

/**
 * Create a new portfolio in the database
 */
export async function createPortfolio(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Portfolio name cannot be empty" };
    }
    
    // Check if portfolio already exists
    const existing = await prisma.systemPortfolio.findUnique({
      where: { name: trimmedName }
    });
    
    if (existing) {
      return { success: false, error: "Portfolio already exists" };
    }
    
    // Create the portfolio
    await prisma.systemPortfolio.create({
      data: { name: trimmedName }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error creating portfolio:", error);
    return { success: false, error: error.message };
  }
}
