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
    maxAge: 60 * 60 * 24 * 365,
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
      // 🚀 THE ZOMBIE KILLER: Only create a default portfolio if ZERO portfolios exist in the whole system.
      // It will no longer force "Main Portfolio" to resurrect if you have other portfolios like "April 2026".
      const count = await prisma.systemPortfolio.count();
      if (count === 0) {
        await prisma.systemPortfolio.create({
          data: { name: DEFAULT_PORTFOLIO }
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring default portfolio:", error);
  }
}

export async function deletePortfolioAction(portfolioName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 🚀 NO SILENT SHIELDS: The system will systematically wipe data. If it hits a snag, it will throw a loud error!
    if (prisma.payment) await prisma.payment.deleteMany({ where: { loan: { portfolio: portfolioName } } });
    if (prisma.loanInstallment) await prisma.loanInstallment.deleteMany({ where: { loan: { portfolio: portfolioName } } });
    if (prisma.loan) await prisma.loan.deleteMany({ where: { portfolio: portfolioName } });
    
    if (prisma.clientMessage) await prisma.clientMessage.deleteMany({ where: { client: { portfolio: portfolioName } } });
    if ((prisma as any).message) await (prisma as any).message.deleteMany({ where: { client: { portfolio: portfolioName } } });
    
    if (prisma.client) await prisma.client.deleteMany({ where: { portfolio: portfolioName } });
    if (prisma.ledger) await prisma.ledger.deleteMany({ where: { portfolio: portfolioName } });
    if (prisma.expense) await prisma.expense.deleteMany({ where: { portfolio: portfolioName } });
    if (prisma.capitalTransaction) await prisma.capitalTransaction.deleteMany({ where: { portfolio: portfolioName } });

    // Delete the portfolio from the registry using deleteMany to avoid unique ID lookup crashes
    if (prisma.systemPortfolio) await prisma.systemPortfolio.deleteMany({ where: { name: portfolioName } });

    // Figure out which portfolio to switch to next
    let nextActive = DEFAULT_PORTFOLIO;
    if (prisma.systemPortfolio) {
       const remaining = await prisma.systemPortfolio.findFirst();
       if (remaining) {
           nextActive = remaining.name;
       }
    }

    await setActivePortfolioCookie(nextActive);
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting portfolio:", error);
    // This will now throw the exact reason the database refused to delete the file directly to your screen!
    return { success: false, error: `Matrix Delete Error: ${error.message}` };
  }
}
