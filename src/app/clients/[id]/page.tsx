import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ClientProfileClient from "./ClientProfileClient";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function daysDifference(date1: Date | null | undefined, date2: Date | null | undefined): number {
  if (!date1 || !date2) return 0;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function ClientErrorBoundary({ error }: { error: string }) {
  return (
    <div className="max-w-5xl mx-auto p-4 py-20">
      <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-8 text-center">
        <p className="text-red-400 text-lg font-bold mb-2">Error Loading Client Profile</p>
        <p className="text-zinc-400 text-sm mb-4">{error}</p>
        <a href="/" className="text-blue-400 hover:underline">← Return to Dashboard</a>
      </div>
    </div>
  );
}

export default async function ClientProfilePage({ params }: PageProps) {
  try {
    const { id } = await params;
    const clientId = parseInt(id, 10);
    const portfolio = await getActivePortfolio();

    if (isNaN(clientId)) notFound();

    // Fetch client with all related data, INCLUDING MESSAGES
    const client = await prisma.client.findFirst({
      where: { id: clientId, portfolio },
      include: {
        application: true,
        messages: { orderBy: { createdAt: 'asc' } }, // 🚀 FETCH CHAT HISTORY
        loans: {
          include: {
            payments: { orderBy: { paymentDate: 'desc' } },
            installments: { orderBy: { period: 'asc' } },
            agent: { select: { id: true, name: true, phone: true, portfolio: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) notFound();

  const activeLoans = client.loans.filter(loan => {
    const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return totalPaid < Number(loan.totalRepayment);
  });

  const paidLoans = client.loans.filter(loan => {
    const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return totalPaid >= Number(loan.totalRepayment);
  });

  const totalBorrowed = client.loans.reduce((sum, loan) => sum + Number(loan.principal), 0);
  const totalRepaid = client.loans.reduce((sum, loan) => {
    return sum + loan.payments.reduce((pSum, p) => pSum + Number(p.amount), 0);
  }, 0);

  const allInstallments = client.loans.flatMap(loan => loan.installments);
  const paidOnTime = allInstallments.filter(inst => inst.status === 'PAID').length;
  const paidLate = allInstallments.filter(inst => inst.status === 'LATE').length;
  const missed = allInstallments.filter(inst => inst.status === 'MISSED').length;
  const pending = allInstallments.filter(inst => inst.status === 'PENDING').length;
  
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const currentlyOverdue = allInstallments.filter(inst => {
    return inst.status === 'PENDING' && new Date(inst.dueDate) < today;
  }).length;
  
  let riskLevel: 'EXCELLENT' | 'MODERATE' | 'HIGH' = 'EXCELLENT';
  let riskEmoji = '🟢';
  let riskLabel = 'PRIME';
  let riskColor = 'emerald';
  
  if (currentlyOverdue > 0 || missed > 2 || paidLate > 2) {
    riskLevel = 'HIGH'; riskEmoji = '🔴'; riskLabel = 'DO NOT LEND'; riskColor = 'red';
  } else if (paidLate >= 1 && paidLate <= 2) {
    riskLevel = 'MODERATE'; riskEmoji = '🟡'; riskLabel = 'WATCH'; riskColor = 'yellow';
  }
  
  let riskScore = 100;
  riskScore -= (paidLate * 5);
  riskScore -= (missed * 15);
  riskScore -= (currentlyOverdue * 20);
  riskScore = Math.max(0, Math.min(100, riskScore));

  let trustScore = 100;
  let totalPaymentsAnalyzed = 0;
  
  const paidInstallments = client.loans.flatMap(loan => 
    loan.installments.filter(inst => inst.status === 'PAID' && inst.paymentDate)
  );
  
  paidInstallments.forEach(inst => {
    totalPaymentsAnalyzed++;
    const paymentDate = inst.paymentDate ? new Date(inst.paymentDate) : null;
    const dueDate = new Date(inst.dueDate);
    if (paymentDate && dueDate) {
      const daysDiff = daysDifference(paymentDate, dueDate);
      if (daysDiff > 0) trustScore -= (daysDiff * 5);
      else trustScore += 2;
    }
  });
  
  trustScore = Math.max(0, Math.min(100, trustScore));
  
  let trustTier: 'PRIME' | 'WATCH' | 'HIGH_RISK';
  let trustColor: string;
  if (trustScore >= 90) { trustTier = 'PRIME'; trustColor = 'emerald'; } 
  else if (trustScore >= 70) { trustTier = 'WATCH'; trustColor = 'yellow'; } 
  else { trustTier = 'HIGH_RISK'; trustColor = 'red'; }

  const totalCompleted = paidOnTime + paidLate + missed;
  const onTimePercentage = totalCompleted > 0 ? Math.round((paidOnTime / totalCompleted) * 100) : 100;

  const allTransactions = client.loans.flatMap(loan => 
    loan.payments.map(payment => ({
      id: payment.id, loanId: loan.id, amount: Number(payment.amount),
      principalPortion: Number(payment.principalPortion), interestPortion: Number(payment.interestPortion),
      paymentDate: payment.paymentDate, paymentType: payment.paymentType, periodNumber: payment.periodNumber
    }))
  ).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  const kycData = client.application ? {
    firstName: client.application.firstName, lastName: client.application.lastName,
    phone: client.application.phone, address: client.application.address,
    birthDate: client.application.birthDate, age: client.application.age,
    employment: client.application.employment, income: Number(client.application.income),
    existingLoansDetails: client.application.existingLoansDetails,
    monthlyDebtPayment: client.application.monthlyDebtPayment ? Number(client.application.monthlyDebtPayment) : null,
    familySize: client.application.familySize, workingMembers: client.application.workingMembers,
    students: client.application.students, infants: client.application.infants,
    housingStatus: client.application.housingStatus,
    rentAmount: client.application.rentAmount ? Number(client.application.rentAmount) : null,
    monthlyBills: client.application.monthlyBills ? Number(client.application.monthlyBills) : null,
    fbProfileUrl: client.application.fbProfileUrl, messengerId: client.application.messengerId,
    referenceName: client.application.referenceName, referencePhone: client.application.referencePhone,
    selfieUrl: client.application.selfieUrl, idPhotoUrl: client.application.idPhotoUrl,
    payslipPhotoUrl: client.application.payslipPhotoUrl, electricBillPhotoUrl: client.application.electricBillPhotoUrl,
    waterBillPhotoUrl: client.application.waterBillPhotoUrl, collateralUrl: client.application.collateralUrl,
    locationLat: client.application.locationLat, locationLng: client.application.locationLng,
    locationUrl: client.application.locationUrl,
    digitalSignature: client.digitalSignature || client.application.digitalSignature,
    credibilityScore: client.application.credibilityScore, aiRiskSummary: client.application.aiRiskSummary,
    status: client.application.status, createdAt: client.application.createdAt
  } : null;

  const clientData = {
    id: client.id, firstName: client.firstName, lastName: client.lastName,
    phone: client.phone || "N/A", address: client.address || "N/A",
    createdAt: client.createdAt, portfolio: client.portfolio,
    riskScore, riskLevel, riskEmoji, riskLabel, riskColor,
    onTimePercentage, trustScore, trustTier, trustColor, totalPaymentsAnalyzed,
    paymentStats: { paidOnTime, paidLate, missed, pending, currentlyOverdue },
    totalBorrowed, totalRepaid, activeLoansCount: activeLoans.length, paidLoansCount: paidLoans.length,
    messages: client.messages || [], // 🚀 PASSING MESSAGES TO CLIENT
    loans: client.loans.map(loan => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalInterestPaid = loan.payments.reduce((sum, p) => sum + Number(p.interestPortion), 0);
      const totalPenaltiesPaid = loan.installments.reduce((sum, i) => sum + Number(i.penaltyFee || 0), 0);
      const agentCommissions = loan.agent ? loan.payments.reduce((sum, p) => sum + (Number(p.interestPortion) * 0.4), 0) : 0;
      const netLoanProfit = (totalInterestPaid + totalPenaltiesPaid) - agentCommissions;
      
      return {
        id: loan.id, principal: Number(loan.principal), interestRate: Number(loan.interestRate),
        termDuration: loan.termDuration, termType: loan.termType, totalRepayment: Number(loan.totalRepayment),
        totalPaid, remainingBalance: Number(loan.totalRepayment) - totalPaid,
        startDate: loan.startDate, endDate: loan.endDate, createdAt: loan.createdAt,
        status: totalPaid >= Number(loan.totalRepayment) ? "PAID" : "ACTIVE",
        installmentsCount: loan.installments.length, paidInstallments: loan.installments.filter(i => i.status === "PAID").length,
        totalInterestPaid, totalPenaltiesPaid, agentCommissions, netLoanProfit,
        agentName: loan.agent?.name || null,
        installments: loan.installments.map(inst => ({
          id: inst.id, period: inst.period, dueDate: inst.dueDate, expectedAmount: Number(inst.expectedAmount),
          principal: Number(inst.principal), interest: Number(inst.interest), penaltyFee: Number(inst.penaltyFee || 0),
          status: inst.status, paymentDate: inst.paymentDate
        }))
      };
    }),
    transactions: allTransactions,
    kycData
  };

  return <ClientProfileClient client={clientData} />;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return <ClientErrorBoundary error={errorMessage} />;
  }
}
