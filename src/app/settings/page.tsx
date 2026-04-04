import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import SettingsClient from "./SettingsClient";
import { ensureDefaultPortfolio } from "./actions";

export const dynamic = "force-dynamic";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function getActivePortfolio() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;
}

async function getPortfolioList() {
  try {
    // Ensure default portfolio exists
    await ensureDefaultPortfolio();
    
    // Get all portfolios from the dedicated SystemPortfolio table
    const portfolios = await prisma.systemPortfolio.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    return portfolios.map(p => p.name);
  } catch (error) {
    console.error("Error fetching portfolio list:", error);
    return [DEFAULT_PORTFOLIO];
  }
}

export default async function SettingsPage() {
  const activePortfolio = await getActivePortfolio();
  const portfolioList = await getPortfolioList();

  return <SettingsClient activePortfolio={activePortfolio} portfolioList={portfolioList} />;
}
