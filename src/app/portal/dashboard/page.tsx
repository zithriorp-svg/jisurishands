import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ClientDashboardClient from "./ClientDashboardClient";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const cookieStore = await cookies();
  
  // Verify session - CRITICAL SECURITY CHECK
  const clientSession = cookieStore.get("client_session")?.value;
  const clientIdStr = cookieStore.get("client_id")?.value;

  if (clientSession !== "authenticated" || !clientIdStr) {
    redirect("/portal");
  }

  const clientId = parseInt(clientIdStr);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      messages: { // 🚀 FETCH CHAT HISTORY
        orderBy: { createdAt: "asc" }
      },
      loans: {
        where: { status: "ACTIVE" },
        include: {
          installments: {
            orderBy: { period: "asc" }
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 10
          }
        }
      },
      application: true
    }
  });

  if (!client) {
    redirect("/portal");
  }

  let totalBorrowed = 0;
  let totalPaid = 0;
  let remainingBalance = 0;
  let totalPenalties = 0; // 🚀 NEW: Track strict penalty fees
  let nextDueDate: Date | null = null;
  let nextDueAmount = 0;
  let nextDuePeriod = 0;
  let activeLoanId = 0;

  for (const loan of client.loans) {
    totalBorrowed += Number(loan.totalRepayment);
    remainingBalance += Number(loan.totalRepayment) - Number(loan.totalPaid || 0);
    totalPaid += Number(loan.totalPaid || 0);

    for (const inst of loan.installments) {
      totalPenalties += Number(inst.penaltyFee || 0); // Accumulate penalties

      if (inst.status === "PENDING") {
        if (!nextDueDate || new Date(inst.dueDate) < nextDueDate) {
          nextDueDate = new Date(inst.dueDate);
          nextDueAmount = Number(inst.expectedAmount) + Number(inst.penaltyFee || 0); // Include penalty in next due
          nextDuePeriod = inst.period;
          activeLoanId = loan.id;
        }
        break; 
      }
    }
  }

  let totalInstallments = 0;
  let paidOnTime = 0;
  let paidLate = 0;
  let pending = 0;
  let overdue = 0;

  for (const loan of client.loans) {
    for (const inst of loan.installments) {
      totalInstallments++;
      if (inst.status === "PAID") {
        paidOnTime++;
      } else if (inst.status === "LATE") {
        paidLate++;
      } else if (inst.status === "PENDING" || inst.status === "PARTIAL") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(inst.dueDate) < today) {
          overdue++;
        } else {
          pending++;
        }
      }
    }
  }

  const trustScore = totalInstallments > 0 
    ? Math.round((paidOnTime / totalInstallments) * 100) 
    : 100;

  let trustTier = "PRIME";
  let trustColor = "text-emerald-400";
  let trustBg = "bg-emerald-500/20";
  
  if (trustScore < 70 || overdue > 0) { // Overdue forces HIGH RISK
    trustTier = "HIGH RISK";
    trustColor = "text-rose-400";
    trustBg = "bg-rose-500/20";
  } else if (trustScore < 90) {
    trustTier = "WATCH";
    trustColor = "text-amber-400";
    trustBg = "bg-amber-500/20";
  }

  const serializedLoans = client.loans.map(loan => ({
    id: loan.id,
    principal: Number(loan.principal),
    interestRate: Number(loan.interestRate),
    termDuration: loan.termDuration,
    termType: loan.termType,
    totalRepayment: Number(loan.totalRepayment),
    totalPaid: Number(loan.totalPaid || 0),
    remainingBalance: Number(loan.totalRepayment) - Number(loan.totalPaid || 0),
    startDate: loan.startDate.toISOString(),
    endDate: loan.endDate.toISOString(),
    status: loan.status,
    installments: loan.installments.map(inst => ({
      period: inst.period,
      dueDate: inst.dueDate.toISOString(),
      expectedAmount: Number(inst.expectedAmount),
      principal: Number(inst.principal),
      interest: Number(inst.interest),
      penaltyFee: Number(inst.penaltyFee || 0),
      status: inst.status,
      paymentDate: inst.paymentDate?.toISOString() || null,
      amountPaid: Number(inst.amountPaid || 0)
    })),
    payments: loan.payments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      periodNumber: p.periodNumber,
      paymentType: p.paymentType
    }))
  }));

  const dashboardData = {
    clientName: `${client.firstName} ${client.lastName}`,
    clientId: client.id,
    totalBorrowed,
    totalPaid,
    remainingBalance,
    totalPenalties, // 🚀 ADDED PENALTIES
    nextDueDate: nextDueDate?.toISOString() || null,
    nextDueAmount,
    nextDuePeriod,
    activeLoanId,
    trustScore,
    trustTier,
    trustColor,
    trustBg,
    paymentStats: {
      totalInstallments,
      paidOnTime,
      paidLate,
      pending,
      overdue
    },
    loans: serializedLoans,
    messages: client.messages.map(msg => ({ // 🚀 ADDED MESSAGES
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      createdAt: msg.createdAt.toISOString()
    }))
  };

  return <ClientDashboardClient data={dashboardData} />;
}
