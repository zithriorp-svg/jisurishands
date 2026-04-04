import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getActivePortfolio } from "@/lib/portfolio";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "SYSTEM FAULT: Missing Key." }, { status: 500 });

    const cookieStore = await cookies();
    const portfolio = await getActivePortfolio();
    
    const { message } = await req.json();

    // ============================================================================
    // 🧠 GATHERING LIVE DATABASE CONTEXT FOR THE AI
    // ============================================================================
    const activeLoans = await prisma.loan.count({ where: { portfolio, status: 'ACTIVE' } });
    const totalClients = await prisma.client.count({ where: { portfolio } });
    
    const today = new Date();
    const overdueInsts = await prisma.loanInstallment.count({
      where: { 
        loan: { portfolio },
        OR: [
          { status: { in: ['LATE', 'MISSED'] } },
          { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: today } }
        ]
      }
    });

    const ledgers = await prisma.ledger.findMany({ where: { portfolio } });
    let totalDisbursed = 0;
    let feeIncome = 0;
    ledgers.forEach(l => {
      if (l.debitAccount === "Loans Receivable") totalDisbursed += Number(l.amount);
      if (l.creditAccount === "Fee Income") feeIncome += Number(l.amount);
    });

    // ============================================================================
    // 🚀 INJECTING RULES & CONTEXT INTO GEMINI
    // ============================================================================
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are the Omniscient AI Core of the FinTech Vault.

YOUR ROLES:
- Chief Financial Strategist: Analyze live data to maximize profit and minimize risk.
- Cognitive Investigator: Identify deceit and drive for a 0% default rate.
- Master Architect: Map out flowcharts and lending strategies using Mermaid.js.

HARDCODED BUSINESS RULES (Do not deviate from these):
1. Base Interest: Loans have a 10% flat interest rate.
2. Good Payer Discount: Clients receive a 4% discount (making the effective rate 6%) if they pay perfectly on time.
3. Penalties: If a client is late, there is NO flat fee. Instead, the 4% discount is REVOKED, and they are charged the full 10% for the life of the loan.
4. Rollover/Extensions: Costs exactly 6% of the original principal as a fee. This shifts due dates forward by one cycle. This fee is pure profit and does not reduce the loan balance.
5. Agent Commissions: Agents receive exactly 40% of all pure interest collected from their assigned loans (The House keeps 60%).

LIVE DATABASE METRICS FOR [${portfolio}]:
- Active Loans: ${activeLoans}
- Total Clients: ${totalClients}
- Overdue Installments: ${overdueInsts}
- Total Capital Disbursed: ₱${totalDisbursed}
- Total Fee/Rollover Income: ₱${feeIncome}

USER MESSAGE: "${message}"

RESPONSE STYLE:
Be sharp, strategic, and concise. Use actionable bullet points. No fluff. 
If the user asks for a flowchart or map, you MUST use markdown mermaid syntax (\`\`\`mermaid ... \`\`\`).`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;

    return NextResponse.json({ reply: response.text() });

  } catch (error: any) {
    console.error("AI ERROR:", error);
    return NextResponse.json({ reply: `ENGINE REJECTION: Neural link severed. ${error.message}` }, { status: 500 });
  }
}
