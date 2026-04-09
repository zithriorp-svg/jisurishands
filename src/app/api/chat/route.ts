import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 THE OMNI-ROUTER CAPTURES THE COMMANDER'S SELECTIONS
    const { message, customPrompt, model, provider, clientKey } = body;
    
    if (!message) {
      return NextResponse.json({ error: "Empty query received." }, { status: 400 });
    }

    const safeProvider = provider || "gemini";

    // ==========================================
    // 1. LIVE VAULT TELEMETRY GATHERING
    // ==========================================
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

    const finalPrompt = `${customPrompt || "You are the Vault AI Core. Answer concisely."}\n\n${systemContext}`;

    let replyText = "";

    // ==========================================
    // 2. THE MULTI-LINGUAL ROUTER
    // ==========================================

    if (safeProvider === "gemini") {
      // 🟢 GOOGLE GEMINI ENGINE
      const activeKey = clientKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!activeKey) throw new Error("Missing Gemini API Key.");
      
      const genAI = new GoogleGenerativeAI(activeKey);
      const geminiModel = genAI.getGenerativeModel({ model: model || "gemini-1.5-flash" });
      const result = await geminiModel.generateContent(finalPrompt);
      replyText = result.response.text();

    } else if (safeProvider === "openai" || safeProvider === "deepseek" || safeProvider === "grok") {
      // 🔵 OPENAI COMPATIBLE ENGINES (ChatGPT, DeepSeek, xAI)
      if (!clientKey) throw new Error(`Missing API Key for ${safeProvider.toUpperCase()}. Please paste it in the settings.`);
      
      let endpoint = "https://api.openai.com/v1/chat/completions";
      if (safeProvider === "deepseek") endpoint = "https://api.deepseek.com/chat/completions";
      if (safeProvider === "grok") endpoint = "https://api.x.ai/v1/chat/completions";

      const defaultModel = safeProvider === "openai" ? "gpt-4o-mini" : safeProvider === "deepseek" ? "deepseek-chat" : "grok-1";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${clientKey}`
        },
        body: JSON.stringify({
          model: model || defaultModel,
          messages: [{ role: "user", content: finalPrompt }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `API Error: ${response.statusText}`);
      replyText = data.choices[0].message.content;

    } else if (safeProvider === "claude") {
      // 🟠 ANTHROPIC CLAUDE ENGINE
      if (!clientKey) throw new Error("Missing API Key for Claude. Please paste it in the settings.");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": clientKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: model || "claude-3-haiku-20240307",
          max_tokens: 1500,
          messages: [{ role: "user", content: finalPrompt }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `API Error: ${response.statusText}`);
      replyText = data.content[0].text;

    } else {
      // 🔴 UNKNOWN ENGINES (Z.AI, Pecoclaw, etc.)
      throw new Error(`The native endpoint for ${safeProvider.toUpperCase()} is not yet hardwired into the router. Use Gemini, ChatGPT, Claude, Grok, or DeepSeek for now.`);
    }

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error("AI Forecaster Error:", error);
    return NextResponse.json({ error: error.message || "Unknown Core Failure" }, { status: 500 });
  }
}
