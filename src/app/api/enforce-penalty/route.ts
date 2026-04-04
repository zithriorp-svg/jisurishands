import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await req.json();
    const { installmentId, loanId } = body;

    if (!installmentId || !loanId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        installments: true,
        client: true
      }
    });

    if (!loan) {
      return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    }

    // 🚀 NEW SAFETY LOCK: We use the actual Loan flag, not a phantom table!
    if (loan.goodPayerDiscountRevoked) {
       return NextResponse.json({ success: false, error: "Penalty already applied. Discount is permanently revoked." }, { status: 400 });
    }

    const installment = loan.installments.find(i => i.id === installmentId);
    if (!installment) {
      return NextResponse.json({ success: false, error: "Installment not found" }, { status: 404 });
    }

    // MATHEMATICAL PRECISION
    const currentPenalty = parseFloat(installment.penaltyFee?.toString() || "0");
    const penaltyAmountToAdd = 40.00; 
    const newTotalPenalty = parseFloat((currentPenalty + penaltyAmountToAdd).toFixed(2));

    // Update the installment
    await prisma.loanInstallment.update({
      where: { id: installmentId },
      data: { penaltyFee: newTotalPenalty }
    });

    // Revoke the discount globally
    await prisma.loan.update({
      where: { id: loanId },
      data: { goodPayerDiscountRevoked: true }
    });

    // 🚀 Use the real Audit Log table
    await prisma.auditLog.create({
      data: {
        type: 'PENALTY_APPLIED',
        amount: penaltyAmountToAdd,
        description: `Revoked 4% Good Payer Discount for TXN-${loanId}. Added ₱40.00 penalty to Period ${installment.period}.`,
        portfolio
      }
    });

    // Send Comm-Link Message
    await prisma.message.create({
      data: {
        clientId: loan.clientId,
        sender: "VAULT SYSTEM",
        text: `⚠️ PENALTY NOTICE: Your 4% Good Payer Discount has been revoked for Installment #${installment.period} due to late payment. A ₱40.00 penalty has been added to your balance. Please settle immediately.`
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Penalty enforcement error:", error);
    return NextResponse.json({ success: false, error: "System Error: " + error.message }, { status: 500 });
  }
}
