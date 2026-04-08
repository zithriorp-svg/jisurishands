"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface SplitPaymentResult {
  success: boolean;
  payment?: {
    id: number;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    remainingBalance: number;
    paymentDate: Date;
    paymentType: string;
    installmentId: number;
    periodNumber: number;
  };
  installment?: {
    id: number;
    period: number;
    principalPaid: number;
    interestPaid: number;
    status: string;
  };
  loan?: {
    id: number;
    clientId: number;
    clientName: string;
    principal: number;
    totalRepayment: number;
  };
  totalPaidToDate?: number;
  error?: string;
}

export async function processSplitPaymentAction(
  installmentId: number,
  paymentType: "INTEREST" | "PRINCIPAL"
): Promise<SplitPaymentResult> {
  try {
    const installment = await prisma.loanInstallment.findUnique({
      where: { id: installmentId },
      include: { loan: { include: { client: true, installments: true } } }
    });

    if (!installment) return { success: false, error: "Installment not found" };

    const loan = installment.loan;
    const amount = paymentType === "INTEREST" 
      ? Number(installment.interest) - Number(installment.interestPaid)
      : Number(installment.principal) - Number(installment.principalPaid);

    if (amount <= 0) return { success: false, error: `${paymentType} already paid for this installment` };

    // 🚀 STRICT RECALCULATION: Bypass corrupted database records
    const computedTotalRepayment = loan.installments.reduce((sum, inst) => sum + Number(inst.expectedAmount), 0);
    const safeTotalRepayment = computedTotalRepayment > 0 ? computedTotalRepayment : Number(loan.totalRepayment);

    const allPayments = await prisma.payment.findMany({ where: { loanId: loan.id, status: "Paid" } });
    const totalPaidBefore = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingBalance = Math.max(0, safeTotalRepayment - totalPaidBefore - amount);

    const payment = await prisma.payment.create({
      data: {
        loanId: loan.id, periodNumber: installment.period, amount,
        principalPortion: paymentType === "PRINCIPAL" ? amount : 0,
        interestPortion: paymentType === "INTEREST" ? amount : 0,
        remainingBalance, status: "Paid", paymentType, installmentId: installment.id, paymentDate: new Date()
      }
    });

    const newPrincipalPaid = paymentType === "PRINCIPAL" ? Number(installment.principalPaid) + amount : Number(installment.principalPaid);
    const newInterestPaid = paymentType === "INTEREST" ? Number(installment.interestPaid) + amount : Number(installment.interestPaid);
    const newAmountPaid = Number(installment.amountPaid) + amount;

    const principalFullyPaid = newPrincipalPaid >= Number(installment.principal);
    const interestFullyPaid = newInterestPaid >= Number(installment.interest);
    let newStatus = installment.status;
    
    if (principalFullyPaid && interestFullyPaid) newStatus = "PAID";
    else if (newPrincipalPaid > 0 || newInterestPaid > 0) newStatus = "PARTIAL";

    await prisma.loanInstallment.update({
      where: { id: installmentId },
      data: { principalPaid: newPrincipalPaid, interestPaid: newInterestPaid, amountPaid: newAmountPaid, status: newStatus, paymentDate: new Date(), paymentId: payment.id }
    });

    await prisma.$transaction([
      prisma.ledger.create({
        data: {
          debitAccount: "Vault Cash", creditAccount: paymentType === "INTEREST" ? "Interest Income" : "Loans Receivable",
          amount, transactionType: paymentType === "INTEREST" ? "Interest Payment" : "Principal Payment", loanId: loan.id, paymentId: payment.id
        }
      }),
      prisma.auditLog.create({
        data: {
          type: "REPAYMENT", amount, referenceId: payment.id, referenceType: "PAYMENT",
          description: `${paymentType} payment received from ${loan.client.firstName} ${loan.client.lastName} - TXN-${loan.id.toString().padStart(4, '0')} Period ${installment.period} (₱${amount.toLocaleString()})`, portfolio: loan.portfolio
        }
      })
    ]);

    if (paymentType === "INTEREST" && loan.agentId) {
      const agentCommission = amount * 0.4;
      await prisma.agentCommission.create({ data: { agentId: loan.agentId, loanId: loan.id, amount: agentCommission, isPaidOut: false } });
    }

    await prisma.message.create({
      data: {
        clientId: loan.clientId, sender: "VAULT SYSTEM",
        text: `🧾 OFFICIAL RECEIPT (RCP-${payment.id.toString().padStart(6, '0')}): A ${paymentType} payment of ₱${amount.toLocaleString('en-US', {minimumFractionDigits: 2})} has been successfully posted to TXN-${loan.id.toString().padStart(4, '0')}. Remaining Loan Balance: ₱${remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}.`
      }
    });

    const updatedPayments = await prisma.payment.findMany({ where: { loanId: loan.id, status: "Paid" } });
    const totalPaidToDate = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    revalidatePath("/"); revalidatePath("/payments"); revalidatePath("/accounting"); revalidatePath(`/clients/${loan.clientId}`); revalidatePath("/agent-portal");

    return {
      success: true,
      payment: { id: payment.id, amount: Number(payment.amount), principalPortion: Number(payment.principalPortion), interestPortion: Number(payment.interestPortion), remainingBalance: Number(payment.remainingBalance), paymentDate: payment.paymentDate, paymentType: payment.paymentType, installmentId: installment.id, periodNumber: installment.period },
      installment: { id: installment.id, period: installment.period, principalPaid: newPrincipalPaid, interestPaid: newInterestPaid, status: newStatus },
      loan: { id: loan.id, clientId: loan.clientId, clientName: `${loan.client.firstName} ${loan.client.lastName}`, principal: Number(loan.principal), totalRepayment: safeTotalRepayment },
      totalPaidToDate
    };

  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function processPaymentAction(
  loanId: number, amount: number, principalPortion: number, interestPortion: number
): Promise<SplitPaymentResult> {
  if (!loanId || !amount || amount <= 0) return { success: false, error: "Invalid payment data" };

  try {
    const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { client: true, installments: true } });
    if (!loan) return { success: false, error: "Loan not found" };

    // 🚀 STRICT RECALCULATION
    const computedTotalRepayment = loan.installments.reduce((sum, inst) => sum + Number(inst.expectedAmount), 0);
    const safeTotalRepayment = computedTotalRepayment > 0 ? computedTotalRepayment : Number(loan.totalRepayment);
    const currentRemaining = Math.max(0, safeTotalRepayment - amount);

    const payment = await prisma.payment.create({
      data: { loanId, amount, principalPortion: principalPortion || amount * 0.8, interestPortion: interestPortion || amount * 0.2, remainingBalance: currentRemaining, status: "Paid", paymentType: "FULL", paymentDate: new Date() }
    });

    const oldestPendingInstallment = await prisma.loanInstallment.findFirst({
      where: { loanId, status: { in: ["PENDING", "LATE", "MISSED", "PARTIAL"] } },
      orderBy: [ { dueDate: 'asc' }, { period: 'asc' } ]
    });

    if (oldestPendingInstallment) {
      await prisma.loanInstallment.update({
        where: { id: oldestPendingInstallment.id },
        data: { status: "PAID", paymentDate: new Date(), amountPaid: amount, principalPaid: Number(oldestPendingInstallment.principal), interestPaid: Number(oldestPendingInstallment.interest), paymentId: payment.id }
      });
    }

    await prisma.$transaction([
      prisma.ledger.create({ data: { debitAccount: "Vault Cash", creditAccount: "Loans Receivable", amount, transactionType: "Loan Repayment", loanId, paymentId: payment.id } }),
      prisma.auditLog.create({ data: { type: "REPAYMENT", amount, referenceId: payment.id, referenceType: "PAYMENT", description: `FULL payment received from ${loan.client.firstName} ${loan.client.lastName} - TXN-${loan.id.toString().padStart(4, '0')} (₱${amount.toLocaleString()})`, portfolio: loan.portfolio } })
    ]);

    await prisma.message.create({
      data: { clientId: loan.clientId, sender: "VAULT SYSTEM", text: `🧾 OFFICIAL RECEIPT (RCP-${payment.id.toString().padStart(6, '0')}): A FULL payment of ₱${amount.toLocaleString('en-US', {minimumFractionDigits: 2})} has been successfully posted to TXN-${loan.id.toString().padStart(4, '0')}. Remaining Loan Balance: ₱${currentRemaining.toLocaleString('en-US', {minimumFractionDigits: 2})}.` }
    });

    const allPayments = await prisma.payment.findMany({ where: { loanId, status: "Paid" } });
    const totalPaidToDate = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    revalidatePath("/"); revalidatePath("/payments"); revalidatePath("/accounting"); revalidatePath(`/clients/${loan.clientId}`); revalidatePath("/agent-portal");

    return {
      success: true,
      payment: { id: payment.id, amount: Number(payment.amount), principalPortion: Number(payment.principalPortion), interestPortion: Number(payment.interestPortion), remainingBalance: Number(payment.remainingBalance), paymentDate: payment.paymentDate, paymentType: "FULL", installmentId: oldestPendingInstallment?.id || 0, periodNumber: oldestPendingInstallment?.period || 1 },
      loan: { id: loan.id, clientId: loan.clientId, clientName: `${loan.client.firstName} ${loan.client.lastName}`, principal: Number(loan.principal), totalRepayment: safeTotalRepayment },
      totalPaidToDate
    };

  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function getLoanDetailsAction(loanId: number) {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        client: true,
        payments: { where: { status: "Paid" }, orderBy: { paymentDate: "asc" } },
        installments: { orderBy: { period: 'asc' } }
      }
    });

    if (!loan) return { error: "Loan not found" };

    const principal = Number(loan.principal);
    const interestRate = Number(loan.interestRate);
    const termDuration = loan.termDuration;
    
    // 🚀 STRICT RECALCULATION
    const computedTotalRepayment = loan.installments.reduce((sum, inst) => sum + Number(inst.expectedAmount), 0);
    const safeTotalRepayment = computedTotalRepayment > 0 ? computedTotalRepayment : Number(loan.totalRepayment);
    const safeTotalInterest = safeTotalRepayment - principal;
    const monthlyPayment = safeTotalRepayment / termDuration;

    const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const safeRemainingBalance = Math.max(0, safeTotalRepayment - totalPaid);

    const now = new Date();
    await prisma.loanInstallment.updateMany({
      where: { loanId, status: "PENDING", dueDate: { lt: now } },
      data: { status: "LATE" }
    });

    const schedule = loan.installments.map((inst) => ({
      id: inst.id, period: inst.period, dueDate: inst.dueDate,
      payment: Number(inst.expectedAmount), principal: Number(inst.principal), interest: Number(inst.interest),
      principalPaid: Number(inst.principalPaid), interestPaid: Number(inst.interestPaid), balance: 0,
      status: inst.status, paymentDate: inst.paymentDate, amountPaid: Number(inst.amountPaid), penaltyFee: Number(inst.penaltyFee || 0)
    }));

    let runningBalance = safeTotalRepayment;
    schedule.forEach((row, idx) => {
      runningBalance -= row.payment;
      schedule[idx].balance = Math.max(0, runningBalance + row.payment);
    });

    return {
      loan: {
        id: loan.id, client: loan.client, principal, interestRate, termDuration,
        totalInterest: safeTotalInterest, totalRepayment: safeTotalRepayment, monthlyPayment,
        remainingBalance: safeRemainingBalance, totalPaid, startDate: loan.startDate, endDate: loan.endDate, termType: loan.termType
      },
      schedule,
      payments: loan.payments
    };

  } catch (error: any) { return { error: error.message }; }
}

export async function getDelinquencyAlerts() {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueSoon = await prisma.loanInstallment.findMany({
      where: { status: "PENDING", dueDate: { gte: now, lte: twentyFourHoursFromNow } },
      include: { loan: { include: { client: true } } }, orderBy: { dueDate: 'asc' }
    });

    const overdue = await prisma.loanInstallment.findMany({
      where: { status: { in: ["PENDING", "LATE", "MISSED", "PARTIAL"] }, dueDate: { lt: now } },
      include: { loan: { include: { client: true } } }, orderBy: { dueDate: 'asc' }
    });

    if (overdue.length > 0) {
      await prisma.loanInstallment.updateMany({
        where: { id: { in: overdue.map(i => i.id) }, status: "PENDING" }, data: { status: "LATE" }
      });
    }

    return {
      dueSoon: dueSoon.map(i => ({ id: i.id, loanId: i.loanId, period: i.period, dueDate: i.dueDate, expectedAmount: Number(i.expectedAmount), clientName: `${i.loan.client.firstName} ${i.loan.client.lastName}`, status: "DUE_SOON" })),
      overdue: overdue.map(i => ({ id: i.id, loanId: i.loanId, period: i.period, dueDate: i.dueDate, expectedAmount: Number(i.expectedAmount), clientName: `${i.loan.client.firstName} ${i.loan.client.lastName}`, status: i.status }))
    };

  } catch (error: any) { return { dueSoon: [], overdue: [] }; }
}
