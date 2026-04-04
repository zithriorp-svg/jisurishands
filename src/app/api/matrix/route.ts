import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";
import { GoogleGenerativeAI } from "@google/generative-ai";

// CRITICAL: Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // === LIVE DATA FETCHING FOR ACTIVE PORTFOLIO ===
    const portfolio = await getActivePortfolio();

    // 1. Get capital transactions (deposits/withdrawals) for this portfolio
    const capitalTransactions = await prisma.capitalTransaction.findMany({ 
      where: { portfolio } 
    });
    let totalCapitalDeposits = 0;
    let totalCapitalWithdrawals = 0;
    capitalTransactions.forEach(tx => {
      if (tx.type === "DEPOSIT") totalCapitalDeposits += Number(tx.amount);
      else totalCapitalWithdrawals += Number(tx.amount);
    });

    // 2. Get expenses for this portfolio
    const expenses = await prisma.expense.findMany({ 
      where: { portfolio } 
    });
    let totalExpenses = 0;
    expenses.forEach(exp => totalExpenses += Number(exp.amount));

    // 3. Get ledgers for disbursements calculation
    const ledgers = await prisma.ledger.findMany({ 
      where: { portfolio } 
    });
    let totalDisbursements = 0;
    ledgers.forEach(entry => {
      if (entry.debitAccount === "Loans Receivable") totalDisbursements += Number(entry.amount);
    });

    // 4. Get loans in this portfolio to fetch payments
    const loansInPortfolio = await prisma.loan.findMany({
      where: { portfolio },
      select: { id: true }
    });
    const loanIds = loansInPortfolio.map(l => l.id);

    // 5. Get payments (collections) for loans in this portfolio
    const payments = await prisma.payment.findMany({ 
      where: { 
        loanId: { in: loanIds },
        status: "Paid" 
      } 
    });
    let totalPrincipalCollected = 0;
    let totalInterestCollected = 0;
    payments.forEach(p => {
      totalPrincipalCollected += Number(p.principalPortion);
      totalInterestCollected += Number(p.interestPortion);
    });

    // 6. Calculate LIVE Vault Cash (same formula as dashboard)
    const vaultCash = totalCapitalDeposits - totalCapitalWithdrawals - totalDisbursements + totalPrincipalCollected + totalInterestCollected - totalExpenses;

    // 7. Calculate Outstanding Loans
    const outstandingLoans = totalDisbursements - totalPrincipalCollected;

    // 8. Get active loan count
    const activeLoans = await prisma.loan.count({ 
      where: { portfolio, status: "ACTIVE" } 
    });

    // 9. Get client count for this portfolio
    const clients = await prisma.client.findMany({ 
      where: { portfolio } 
    });
    const clientCount = clients.length;

    // 10. Get pending installments count
    const pendingInstallments = await prisma.loanInstallment.count({
      where: {
        status: "PENDING",
        loan: { portfolio }
      }
    });

    // Format numbers for display
    const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // === SYSTEM PROMPT WITH LIVE DATA INJECTION ===
    const systemPrompt = `You are the Matrix AI Co-Pilot, an elite FinTech Business Architect, Data Scientist, and Strategic Forecaster.

You must base your analysis STRICTLY on the following real-time telemetry for the active portfolio. DO NOT reference past data or hallucinate numbers.

═══════════════════════════════════════════════════════════
LIVE DATA SNAPSHOT (Active Portfolio: ${portfolio})
═══════════════════════════════════════════════════════════
• Vault Cash: ${formatCurrency(vaultCash)}
• Outstanding Loans: ${formatCurrency(outstandingLoans)}
• Total Capital Deposits: ${formatCurrency(totalCapitalDeposits)}
• Total Capital Withdrawals: ${formatCurrency(totalCapitalWithdrawals)}
• Total Disbursements: ${formatCurrency(totalDisbursements)}
• Principal Collected: ${formatCurrency(totalPrincipalCollected)}
• Interest Collected: ${formatCurrency(totalInterestCollected)}
• Total Expenses: ${formatCurrency(totalExpenses)}
• Active Loans: ${activeLoans}
• Total Clients: ${clientCount}
• Pending Installments: ${pendingInstallments}
═══════════════════════════════════════════════════════════

USER PROMPT: "${prompt}"

CRITICAL MERMAID.JS SYNTAX RULEBOOK:
You MUST generate visual diagrams using Mermaid.js syntax. However, you have been writing invalid syntax causing the renderer to crash.

YOU MUST OBEY THESE RULES STRICTLY:
1. NO SPACES OR SPECIAL CHARACTERS IN NODE IDs. (Use A1, B2, Node1. DO NOT use "Node 1" or "A B").
2. ALWAYS wrap Node Labels in double quotes. Example: A1["High Risk Client"] --> B2["Reject Application"]
3. Do NOT use experimental chart types like sankey-beta. Stick to highly stable charts: Flowcharts (graph TD or graph LR) and Pie charts (pie).
4. Wrap all Mermaid code strictly in markdown blocks:

\`\`\`mermaid
graph TD
Vault["Vault Cash"] --> Branch1["Satellite Branch 1"]
\`\`\`

Be sharp, highly analytical, and focus on aggressive but calculated financial scaling. Use the LIVE DATA above for all calculations and projections. Respond to the user's prompt using these visual rules.`;

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(systemPrompt);

    return NextResponse.json({ 
      reply: result.response.text(),
      portfolio,
      vaultCash: formatCurrency(vaultCash),
      outstandingLoans: formatCurrency(outstandingLoans)
    });

  } catch (error: any) {
    console.error("Matrix AI Error:", error);
    return NextResponse.json({ reply: `⚠️ MATRIX ERROR: ${error.message}` }, { status: 500 });
  }
}
