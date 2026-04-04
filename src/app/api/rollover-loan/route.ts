import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getActivePortfolio } from "@/lib/portfolio";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get("user_role")?.value || "AGENT";
    const isAdmin = userRole === "ADMIN";
    const portfolio = await getActivePortfolio();

    const body = await req.json();
    const { loanId } = body;

    if (!loanId) return NextResponse.json({ success: false, error: "Missing loan ID" }, { status: 400 });

    const loan = await prisma.loan.findFirst({
      where: { id: loanId, portfolio },
      include: { installments: { where: { status: { in: ['PENDING', 'LATE', 'MISSED', 'PARTIAL'] } } } }
    });

    if (!loan) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });

    const extensionFee = Number(loan.principal) * 0.06;

    await prisma.ledger.create({
      data: { transactionType: "ROLLOVER_FEE", amount: extensionFee, debitAccount: "Cash", creditAccount: "Fee Income", loanId: loan.id, portfolio }
    });

    if (isAdmin) {
      await prisma.auditLog.create({
        data: { type: 'PENALTY', amount: extensionFee, referenceId: loan.id, referenceType: 'LOAN', description: `6% Rollover Extension Fee processed.`, portfolio }
      });
    }

    for (const inst of loan.installments) {
      const newDueDate = new Date(inst.dueDate);
      if (loan.termType === "Days") newDueDate.setDate(newDueDate.getDate() + loan.termDuration);
      else if (loan.termType === "Weeks") newDueDate.setDate(newDueDate.getDate() + (loan.termDuration * 7));
      else newDueDate.setMonth(newDueDate.getMonth() + loan.termDuration);

      await prisma.loanInstallment.update({
        where: { id: inst.id }, data: { dueDate: newDueDate, status: "PENDING" }
      });
    }

    // 🚀 INJECT: SYSTEM BOT SENDS MESSAGE TO COMM-LINK
    await prisma.message.create({
      data: {
        clientId: loan.clientId,
        sender: "VAULT SYSTEM",
        text: `🔄 EXTENSION GRANTED: A Rollover has been processed for TXN-${loan.id.toString().padStart(4, '0')}. A 6% Extension Fee of ₱${extensionFee.toLocaleString('en-US', {minimumFractionDigits: 2})} has been applied. Your remaining due dates have been shifted forward.`
      }
    });

    return NextResponse.json({ success: true, extensionFee });

  } catch (error: any) {
    console.error("Rollover Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
