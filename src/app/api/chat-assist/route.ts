import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // 🚀 FAILSAFE: Checks both common Vercel API Key names
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API Key in Vercel Environment." }, { status: 500 });

    const { clientId } = await req.json();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        loans: { 
          where: { status: 'ACTIVE' }, 
          include: { 
            installments: { where: { status: { in: ['PENDING', 'LATE', 'MISSED', 'PARTIAL'] } } },
            payments: { where: { status: 'Paid' } }
          } 
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 5 } 
      }
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    let overdueCount = 0;
    let totalRemaining = 0;
    
    client.loans.forEach(loan => {
       // 🚀 STRICT MATH: Teach the AI the exact remaining balance
       const computedTotalRepayment = loan.installments.reduce((sum, inst) => sum + Number(inst.expectedAmount), 0);
       const safeTotalRepayment = computedTotalRepayment > 0 ? computedTotalRepayment : Number(loan.totalRepayment);
       const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
       
       totalRemaining += Math.max(0, safeTotalRepayment - totalPaid);
       
       loan.installments.forEach(inst => {
         if (new Date(inst.dueDate) < new Date()) overdueCount++;
       });
    });

    const recentChat = client.messages.reverse().map(m => `${m.sender}: ${m.text}`).join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    // 🚀 STABILITY FIX: Forced to 1.5-flash for maximum SDK compatibility
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a highly strategic, firm, and professional FinTech Collection Agent for the "FinTech Vault" system.

CLIENT PROFILE:
- Name: ${client.firstName} ${client.lastName}
- Overdue Payments: ${overdueCount}
- Exact Remaining Balance: ₱${totalRemaining.toLocaleString('en-US', {minimumFractionDigits: 2})}

RECENT CHAT HISTORY:
${recentChat || "No previous messages."}

YOUR MISSION:
Read the chat history and draft a response to the client. 
- If they are asking for a delay/extension, inform them about the "6% Extension/Rollover Fee" required to grant a palugit.
- If they are overdue, firmly remind them that their "4% Good Payer Discount" will be revoked and they will be charged the full 10% interest if they do not pay today.
- Write the response in professional Tagalog or Taglish (very common in Philippine lending).
- Keep it concise. Max 2 or 3 sentences. Be polite but absolutely firm on the contract rules.

OUTPUT:
Provide ONLY the exact message text you want to send. Do not include quotes, greetings like "Here is your draft", or any other formatting.`;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ reply: result.response.text().trim() });

  } catch (error: any) {
    console.error("AI Draft Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
