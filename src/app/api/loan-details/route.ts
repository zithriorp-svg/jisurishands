import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loanId = searchParams.get("loanId");

  if (!loanId) {
    return NextResponse.json({ error: "Loan ID required" }, { status: 400 });
  }

  try {
    const loan = await prisma.loan.findUnique({
      where: { id: Number(loanId) },
      include: {
        client: true,
        payments: {
          where: { status: "Paid" },
          orderBy: { paymentDate: "asc" }
        }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const principal = Number(loan.principal);
    const interestRate = Number(loan.interestRate);
    const termDuration = loan.termDuration;
    const totalInterest = principal * (interestRate / 100) * termDuration;
    const totalRepayment = principal + totalInterest;
    const monthlyPayment = totalRepayment / termDuration;

    // Generate amortization schedule
    const schedule = [];
    let remainingBalance = principal;

    const allPayments = await prisma.payment.findMany({
      where: { loanId: Number(loanId), status: "Paid" }
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const periodsPaid = allPayments.length;

    for (let i = 1; i <= termDuration; i++) {
      const interestPortion = (principal * (interestRate / 100));
      const principalPortion = monthlyPayment - interestPortion;

      schedule.push({
        period: i,
        payment: monthlyPayment,
        principal: principalPortion,
        interest: interestPortion,
        balance: Math.max(0, remainingBalance - principalPortion),
        status: i <= periodsPaid ? "Paid" : "Pending"
      });

      remainingBalance = Math.max(0, remainingBalance - principalPortion);
    }

    return NextResponse.json({
      loan: {
        id: loan.id,
        client: loan.client,
        principal,
        interestRate,
        termDuration,
        totalInterest,
        totalRepayment,
        monthlyPayment,
        remainingBalance: totalRepayment - totalPaid,
        totalPaid,
        startDate: loan.startDate,
        endDate: loan.endDate
      },
      schedule,
      payments: allPayments
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
