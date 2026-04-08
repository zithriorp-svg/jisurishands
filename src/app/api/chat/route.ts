import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Matrix Offline: Missing GEMINI_API_KEY in Vercel Environment Variables." }, { status: 500 });
    }

    const body = await req.json();
    const { message, customPrompt } = body;
    if (!message) {
      return NextResponse.json({ error: "Empty query received." }, { status: 400 });
    }

    const portfolio = await getActivePortfolio();
    
    const loans = await prisma.loan.findMany({
      where: { portfolio },
      include: {
        installments: { orderBy: { period: 'asc' } },
        payments: { where: { status: 'Paid' } }
      }
    });

    const capitalTxs = await prisma.capitalTransaction.findMany({ where: { portfolio } });
    const expenses = await prisma.expense.findMany({ where: { portfolio } });

    let totalDeposits = 0; let totalWithdrawals = 0; let totalExpenses = 0;
    capitalTxs.forEach(tx => { if (tx.type === "DEPOSIT") totalDeposits += Number(tx.amount); else totalWithdrawals += Number(tx.amount); });
    expenses.forEach(exp => { totalExpenses += Number(exp.amount); });

    let totalDisbursed = 0; let totalCollected = 0; let totalInterest = 0; let activeLoansCount = 0;
    let portfolioAtRisk = 0; let overdueInstallments = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    loans.forEach(loan => {
      const principal = Number(loan.principal);
      totalDisbursed += principal;
      
      const collectedPrin = loan.payments.reduce((s, p) => s + Number(p.principalPortion), 0);
      const collectedInt = loan.payments.reduce((s, p) => s + Number(p.interestPortion), 0);
      
      totalCollected += collectedPrin;
      totalInterest += collectedInt;

      if (loan.status === 'ACTIVE') activeLoansCount++;

      let isLate = false;
      loan.installments.forEach(inst => {
        if ((inst.status === 'LATE' || inst.status === 'MISSED' || inst.status === 'PENDING') && new Date(inst.dueDate) < today) {
          overdueInstallments++;
          isLate = true;
        }
      });

      if (isLate && loan.status === 'ACTIVE') {
        portfolioAtRisk += Math.max(0, principal - collectedPrin);
      }
    });

    const vaultCash = totalDeposits + totalCollected + totalInterest - totalWithdrawals - totalDisbursed - totalExpenses;
    const deployableCapital = vaultCash * 0.85;

    const systemContext = `
      LIVE VAULT TELEMETRY FOR PORTFOLIO: "${portfolio}"
      - Available Vault Cash: ₱${vaultCash.toLocaleString('en-US', {minimumFractionDigits: 2})}
      - Deployable Capital (85%): ₱${deployableCapital.toLocaleString('en-US', {minimumFractionDigits: 2})}
      - Total Active Loans: ${activeLoansCount}
      - Total Principal Disbursed: ₱${totalDisbursed.toLocaleString('en-US', {minimumFractionDigits: 2})}
      - Total Principal Collected: ₱${totalCollected.toLocaleString('en-US', {minimumFractionDigits: 2})}
      - Total Interest Collected: ₱${totalInterest.toLocaleString('en-US', {minimumFractionDigits: 2})}
      - Total Operating Expenses: ₱${totalExpenses.toLocaleString('en-US', {minimumFractionDigits: 2})}
      - Late/Overdue Installments System-Wide: ${overdueInstallments}
      - Portfolio at Risk (PAR): ₱${portfolioAtRisk.toLocaleString('en-US', {minimumFractionDigits: 2})}
      
      COMMANDER'S REQUEST: ${message}
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    // 🚀 RESTORED: Natively compatible 2.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const finalPrompt = `${customPrompt || "You are the Vault AI Core. Answer concisely."}\n\n${systemContext}`;

    const result = await model.generateContent(finalPrompt);
    const replyText = result.response.text();

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error("AI Forecaster Error:", error);
    return NextResponse.json({ error: `Matrix Offline: ${error.message || "Unknown Core Failure"}` }, { status: 500 });
  }
}
