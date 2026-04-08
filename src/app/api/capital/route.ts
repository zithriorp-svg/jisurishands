import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function getActivePortfolio() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;
}

export async function GET() {
  try {
    const portfolio = await getActivePortfolio();
    const transactions = await prisma.capitalTransaction.findMany({ 
      where: { portfolio },
      orderBy: { date: 'desc' }, 
      take: 100 
    });
    let totalDeposits = 0, totalWithdrawals = 0;
    transactions.forEach(tx => {
      if (tx.type === "DEPOSIT") totalDeposits += Number(tx.amount);
      else totalWithdrawals += Number(tx.amount);
    });
    return NextResponse.json({ transactions, totalDeposits, totalWithdrawals, netCapital: totalDeposits - totalWithdrawals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const portfolio = await getActivePortfolio();
    const formData = await req.formData();
    const amount = parseFloat(formData.get("amount") as string);
    const type = formData.get("type") as string;
    const description = formData.get("description") as string || null;
    
    if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    if (!type || !["DEPOSIT", "WITHDRAWAL"].includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    
    // 🚀 STRICT SYNC: We now write to the Capital DB, Audit Log, AND the Ledger simultaneously!
    const [transaction] = await prisma.$transaction([
      prisma.capitalTransaction.create({ 
        data: { amount, type, description, portfolio } 
      }),
      // Immutable Audit Log
      prisma.auditLog.create({
        data: {
          type: type === "DEPOSIT" ? "CAPITAL_DEPOSIT" : "CAPITAL_WITHDRAWAL",
          amount,
          referenceType: "CAPITAL",
          description: `Capital ${type.toLowerCase()}: ${description || 'No description'} (₱${amount.toLocaleString()})`,
          portfolio
        }
      }),
      // 🏦 CRITICAL NEW PIECE: The Ledger Entry so the Treasury can see the money!
      prisma.ledger.create({
        data: {
          transactionType: type === "DEPOSIT" ? "Capital Injection" : "Owner Withdrawal",
          amount: amount,
          // Double-Entry Math: 
          // Deposit = Vault Cash (Debit) goes UP, Owner Equity (Credit) goes UP
          // Withdrawal = Owner Equity (Debit) goes DOWN, Vault Cash (Credit) goes DOWN
          debitAccount: type === "DEPOSIT" ? "Vault Cash" : "Owner Equity",
          creditAccount: type === "DEPOSIT" ? "Owner Equity" : "Vault Cash",
          portfolio: portfolio
        }
      })
    ]);
    
    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
