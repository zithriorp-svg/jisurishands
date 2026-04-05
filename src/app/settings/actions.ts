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
    
    if (prisma.systemPortfolio) {
      await prisma.systemPortfolio.upsert({
        where: { name: trimmedName },
        update: {}, 
        create: { name: trimmedName }
      });
    }
    
    await setActivePortfolioCookie(trimmedName);
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error initializing new year:", error);
    return { success: false, error: error.message };
  }
}

export async function ensureDefaultPortfolio(): Promise<void> {
  try {
    if (prisma.systemPortfolio) {
      const existing = await prisma.systemPortfolio.findUnique({
        where: { name: DEFAULT_PORTFOLIO }
      });
      if (!existing) {
        await prisma.systemPortfolio.create({
          data: { name: DEFAULT_PORTFOLIO }
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring default portfolio:", error);
  }
}

// 🛡️ ARMORED: Delete Portfolio Protocol
export async function deletePortfolioAction(portfolioName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (portfolioName === DEFAULT_PORTFOLIO) {
      return { success: false, error: "Cannot delete the Main Portfolio. This is protected." };
    }

    // 1. Delete all related records first (Safely checking if the table exists to prevent crashes)
    if (prisma.payment) await prisma.payment.deleteMany({ where: { loan: { portfolio: portfolioName } } }).catch(()=>{});
    if (prisma.loanInstallment) await prisma.loanInstallment.deleteMany({ where: { loan: { portfolio: portfolioName } } }).catch(()=>{});
    if (prisma.loan) await prisma.loan.deleteMany({ where: { portfolio: portfolioName } }).catch(()=>{});
    
    if (prisma.clientMessage) await prisma.clientMessage.deleteMany({ where: { client: { portfolio: portfolioName } } }).catch(()=>{});
    if ((prisma as any).message) await (prisma as any).message.deleteMany({ where: { client: { portfolio: portfolioName } } }).catch(()=>{});
    
    if (prisma.client) await prisma.client.deleteMany({ where: { portfolio: portfolioName } }).catch(()=>{});
    if (prisma.ledger) await prisma.ledger.deleteMany({ where: { portfolio: portfolioName } }).catch(()=>{});
    if (prisma.expense) await prisma.expense.deleteMany({ where: { portfolio: portfolioName } }).catch(()=>{});
    if (prisma.capitalTransaction) await prisma.capitalTransaction.deleteMany({ where: { portfolio: portfolioName } }).catch(()=>{});

    // 2. Delete the portfolio itself
    if (prisma.systemPortfolio) await prisma.systemPortfolio.delete({ where: { name: portfolioName } }).catch(()=>{});

    // 3. Force switch back to Default Portfolio
    await setActivePortfolioCookie(DEFAULT_PORTFOLIO);
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting portfolio:", error);
    return { success: false, error: error.message || "Failed to delete portfolio. Please check database logs." };
  }
}
