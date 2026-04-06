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
    
    // 🚀 UPGRADE: Now accepting the custom brain prompt from your frontend!
    const { message, customPrompt } = await req.json();

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

    // We still inject the live data at the bottom so the AI always knows the current numbers
    const liveMetrics = `
LIVE DATABASE METRICS FOR [${portfolio}]:
- Active Loans: ${activeLoans}
- Total Clients: ${totalClients}
- Overdue Installments: ${overdueInsts}
- Total Capital Disbursed: ₱${totalDisbursed}
- Total Fee/Rollover Income: ₱${feeIncome}
`;

    // 🚀 THE BRAIN FUSION: Combine your custom UI prompt with the live metrics
    const defaultBrain = `You are the Omniscient AI Core of the FinTech Vault. Be sharp, strategic, and concise. Use actionable bullet points.`;
    const finalPrompt = `${customPrompt || defaultBrain}\n\n${liveMetrics}\n\nUSER MESSAGE: "${message}"\n\nIf the user asks for a flowchart or map, you MUST use markdown mermaid syntax (\`\`\`mermaid ... \`\`\`).`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;

    return NextResponse.json({ reply: response.text() });

  } catch (error: any) {
    console.error("AI ERROR:", error);
    return NextResponse.json({ reply: `ENGINE REJECTION: Neural link severed. ${error.message}` }, { status: 500 });
  }
}
