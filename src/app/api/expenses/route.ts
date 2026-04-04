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
    const expenses = await prisma.expense.findMany({ 
      where: { portfolio },
      orderBy: { date: 'desc' }, 
      take: 100 
    });
    const categoryTotals: Record<string, number> = {};
    let totalExpenses = 0;
    expenses.forEach(exp => {
      const amt = Number(exp.amount);
      totalExpenses += amt;
      if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
      categoryTotals[exp.category] += amt;
    });
    return NextResponse.json({ expenses, categoryTotals, totalExpenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const portfolio = await getActivePortfolio();
    const formData = await req.formData();
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as string;
    const description = formData.get("description") as string || null;
    if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Category required" }, { status: 400 });
    
    // Create expense AND AuditLog in a transaction
    const [expense] = await prisma.$transaction([
      prisma.expense.create({ 
        data: { amount, category, description, portfolio } 
      }),
      // Immutable Audit Log
      prisma.auditLog.create({
        data: {
          type: "EXPENSE",
          amount,
          referenceType: "EXPENSE",
          description: `Expense logged: ${category}${description ? ` - ${description}` : ''} (₱${amount.toLocaleString()})`,
          portfolio
        }
      })
    ]);
    
    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
