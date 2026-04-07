"use server";

import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';
import { cookies } from "next/headers";

const PORTFOLIO_COOKIE = "fintech_portfolio";
const DEFAULT_PORTFOLIO = "Main Portfolio";

async function getActivePortfolio() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTFOLIO_COOKIE)?.value || DEFAULT_PORTFOLIO;
}

function daysDifference(date1: Date | null | undefined, date2: Date | null | undefined): number {
  if (!date1 || !date2) return 0;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function calculateTrustScore(clientId: number): Promise<number> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { loans: { include: { installments: true } } }
  });

  if (!client) return 0;

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

  if (totalPaymentsAnalyzed === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentlyOverdue = client.loans.flatMap(l => l.installments).filter(inst => {
      return inst.status === 'PENDING' && new Date(inst.dueDate) < today;
    }).length;

    if (currentlyOverdue > 0) trustScore = 50; 
  }

  return Math.max(0, Math.min(100, trustScore));
}

export async function submitApplicationRecord(data: any) {
  let portfolio: string;
  
  if (data.targetPortfolioId) {
    const portfolioRecord = await prisma.systemPortfolio.findUnique({
      where: { id: parseInt(data.targetPortfolioId) }
    });
    portfolio = portfolioRecord?.name || data.targetPortfolio || await getActivePortfolio();
  } else {
    portfolio = data.targetPortfolio || await getActivePortfolio();
  }

  let score = 5;
  let summary = "AI Analysis Pending";
  let applicationStatus = "Pending";

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [ { phone: data.phone }, { AND: [ { firstName: data.firstName }, { lastName: data.lastName } ] } ],
        portfolio
      }
    });

    if (existingClient) {
      const trustScore = await calculateTrustScore(existingClient.id);

      if (trustScore >= 90) {
        applicationStatus = "PRE-APPROVED";
        summary = `⚡ PRIME AUTO-APPROVED - Existing client with Trust Score ${trustScore}/100. Fast-tracked for immediate disbursement.`;
        score = 10;
      } else if (trustScore >= 70) {
        applicationStatus = "Pending";
        summary = `⚠️ RETURNING CLIENT (Trust Score: ${trustScore}/100) - Watch tier. Manual review recommended.`;
        score = Math.max(score, 6);
      } else {
        applicationStatus = "Pending";
        summary = `🚨 RETURNING CLIENT (Trust Score: ${trustScore}/100) - High Risk tier. Enhanced due diligence required.`;
        score = Math.min(score, 3);
      }
    }
  } catch (lookupError) {
    console.error("Client lookup error:", lookupError);
  }

  if (applicationStatus !== "PRE-APPROVED") {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an elite Credit Investigator and Risk Strategist.
Perform a forensic risk analysis on this applicant based on NDI (Net Disposable Income) and Demographic Stability.

APPLICANT: ${data.firstName} ${data.lastName}
DEMOGRAPHICS: Age ${data.age || 'Unknown'}
CONTACT: Phone ${data.phone}, Address: ${data.address || 'Not provided'}
EMPLOYMENT: ${data.employment}
FINANCIAL DISCLOSURE:
- Gross Income: PHP ${data.income}
- Disclosed Existing Loans: ${data.existingLoansDetails || 'None disclosed'}
- Stated Monthly Debt Amortization: PHP ${data.monthlyDebtPayment || 0}
LIVING EXPENSES DATA:
- Family Details: ${data.familySize} members, ${data.workingMembers} working.
- Housing: ${data.housingStatus} (Rent: PHP ${data.rentAmount || 0})
- Stated Monthly Utility/Food Bills: PHP ${data.monthlyBills || 0}
COLLATERAL OFFERED: ${data.collateralName || 'None'}. Value: PHP ${data.collateralValue || 0}, Condition: ${data.collateralCondition || 'N/A'}. Requested Loan: PHP ${data.principal || 0}.

YOUR TASK:
1. DEMOGRAPHIC STABILITY: Weigh Age and Family Size.
2. FORENSIC NDI CALCULATION: Stated Gross Income MINUS (Disclosed Debt Amortization + Housing + Stated Bills).
3. CRITICAL EVALUATION: If Monthly Debt + Housing + Bills > 80% of Gross Income, REJECT. 
4. APPRAISAL DIRECTIVE: If the collateral's resale value covers the loan, lower the risk rating. 
5. Assign a forensic Risk Score (1-10) and a summary.

Return ONLY a raw JSON object. Example:
{"score": 7, "summary": "NDI: Gross P25k - Bills P18k = Net P4k. Collateral covers loan. APPROVED."}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiOutput = JSON.parse(text);
        if (aiOutput.score) score = aiOutput.score;
        if (aiOutput.summary && applicationStatus !== "PRE-APPROVED") summary = aiOutput.summary;
      }
    } catch (aiError: any) {
      if (applicationStatus !== "PRE-APPROVED") summary = `Forensic Engine Offline: ${aiError.message}`;
    }
  }

  try {
    await (prisma.application as any).create({
      data: {
        firstName: data.firstName || "", lastName: data.lastName || "", phone: data.phone || "", address: data.address || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null, age: data.age ? parseInt(data.age) : null,
        employment: data.employment || "", income: parseFloat(data.income) || 0,
        familySize: data.familySize ? parseInt(data.familySize.toString()) : null, workingMembers: data.workingMembers ? parseInt(data.workingMembers.toString()) : null,
        students: data.students ? parseInt(data.students.toString()) : null, infants: data.infants ? parseInt(data.infants.toString()) : null,
        housingStatus: data.housingStatus || null, rentAmount: data.rentAmount ? parseFloat(data.rentAmount) : null, monthlyBills: data.monthlyBills ? parseFloat(data.monthlyBills) : null,
        existingLoansDetails: data.existingLoansDetails || null, monthlyDebtPayment: data.monthlyDebtPayment ? parseFloat(data.monthlyDebtPayment) : null,
        referenceName: data.referenceName || null, referencePhone: data.referencePhone || null, fbProfileUrl: data.fbProfileUrl || null, messengerId: data.messengerId || null,
        locationLat: data.locationLat ? parseFloat(data.locationLat) : null, locationLng: data.locationLng ? parseFloat(data.locationLng) : null, locationUrl: data.locationUrl || null,
        selfieUrl: data.selfieUrl || null, idPhotoUrl: data.idPhotoUrl || null, payslipPhotoUrl: data.payslipPhotoUrl || null, electricBillPhotoUrl: data.electricBillPhotoUrl || null, waterBillPhotoUrl: data.waterBillPhotoUrl || null, collateralUrl: data.collateralUrl || null,
        collateralName: data.collateralName || null, collateralDescription: data.collateralDescription || null, collateralDefects: data.collateralDefects || null,
        collateralValue: data.collateralValue ? parseFloat(data.collateralValue) : null, collateralAge: data.collateralAge || null, collateralCondition: data.collateralCondition || null,
        digitalSignature: data.digitalSignature || null, principal: data.principal ? parseFloat(data.principal) : null, termType: data.termType || "Monthly", termDuration: data.termDuration ? parseInt(data.termDuration) : null, interestRate: data.interestRate ? parseFloat(data.interestRate) : 6, totalInterest: data.totalInterest ? parseFloat(data.totalInterest) : null, totalRepayment: data.totalRepayment ? parseFloat(data.totalRepayment) : null, perPeriodAmount: data.perPeriodAmount ? parseFloat(data.perPeriodAmount) : null, agentId: data.agentId ? parseInt(data.agentId) : null,
        credibilityScore: score, aiRiskSummary: summary, status: applicationStatus, portfolio
      }
    });
    revalidatePath("/");
    return { success: true, autoApproved: applicationStatus === "PRE-APPROVED", trustScore: score };
  } catch (dbError: any) {
    console.error("Vault Rejection:", dbError);
    return { error: `DATABASE REJECTION: ${dbError.message}` };
  }
}

interface PaymentScheduleItem {
  periodNumber: number; paymentDate: Date; amount: number; principalPortion: number; interestPortion: number; remainingBalance: number;
}
interface LoanDisbursementData {
  applicationId: number; principal: number; interestRate: number; termDuration: number; termType: "Days" | "Weeks" | "Months"; totalInterest: number; totalRepayment: number; schedule: PaymentScheduleItem[]; agentId?: number | null;
}

export async function disburseLoan(data: LoanDisbursementData) {
  try {
    const portfolio = await getActivePortfolio();
    const currentApp = await prisma.application.findFirst({ where: { id: data.applicationId, portfolio } });
    if (!currentApp) return { error: "Application not found" };

    let client = await prisma.client.findFirst({ where: { firstName: currentApp.firstName, lastName: currentApp.lastName, portfolio } });
    if (!client) {
      client = await prisma.client.create({ data: { firstName: currentApp.firstName || "", lastName: currentApp.lastName || "", phone: currentApp.phone || null, address: currentApp.address || null, digitalSignature: currentApp.digitalSignature, applicationId: data.applicationId, portfolio } });
    } else {
      const updateData: any = {};
      if (!client.applicationId) updateData.applicationId = data.applicationId;
      if (!client.digitalSignature && currentApp.digitalSignature) updateData.digitalSignature = currentApp.digitalSignature;
      if (Object.keys(updateData).length > 0) await prisma.client.update({ where: { id: client.id }, data: updateData });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    switch (data.termType) {
      case "Days": endDate.setDate(endDate.getDate() + data.termDuration); break;
      case "Weeks": endDate.setDate(endDate.getDate() + (data.termDuration * 7)); break;
      case "Months": endDate.setMonth(endDate.getMonth() + data.termDuration); break;
    }

    const loan = await prisma.loan.create({
      data: { clientId: client.id, principal: data.principal, interestRate: data.interestRate, termDuration: data.termDuration, termType: data.termType, totalInterest: data.totalInterest, totalRepayment: data.totalRepayment, startDate: startDate, endDate: endDate, portfolio, agentId: data.agentId || null, collateralName: currentApp.collateralName || null, collateralDescription: currentApp.collateralDescription || null, collateralDefects: currentApp.collateralDefects || null }
    });

    const disbursementDate = new Date();
    for (let i = 0; i < data.schedule.length; i++) {
      const scheduleItem = data.schedule[i];
      const truePeriodNumber = i + 1; 
      const dueDate = new Date(disbursementDate);
      switch (data.termType) {
        case "Days": dueDate.setDate(dueDate.getDate() + truePeriodNumber); break;
        case "Weeks": dueDate.setDate(dueDate.getDate() + (truePeriodNumber * 7)); break;
        case "Months": dueDate.setMonth(dueDate.getMonth() + truePeriodNumber); break;
      }
      await prisma.loanInstallment.create({ data: { loanId: loan.id, period: truePeriodNumber, dueDate: dueDate, expectedAmount: scheduleItem.amount, principal: scheduleItem.principalPortion, interest: scheduleItem.interestPortion, status: "PENDING" } });
    }

    await prisma.$transaction([
      prisma.ledger.create({ data: { transactionType: "Loan Disbursement", amount: data.principal, debitAccount: "Loans Receivable", creditAccount: "Vault Cash", loanId: loan.id, portfolio } }),
      prisma.auditLog.create({ data: { type: "DISBURSEMENT", amount: data.principal, referenceId: loan.id, referenceType: "LOAN", agentId: data.agentId || null, description: `Principal disbursed to ${client.firstName} ${client.lastName} - TXN-${loan.id.toString().padStart(4, '0')} (${data.termDuration} ${data.termType.toLowerCase()})`, portfolio } })
    ]);

    await prisma.application.update({ where: { id: data.applicationId }, data: { status: "APPROVED", client: { connect: { id: client.id } } } });

    revalidatePath("/"); revalidatePath("/payments"); revalidatePath("/clients");
    return { success: true, loanId: loan.id, clientId: client.id };
  } catch (error: any) { return { error: error.message || "Failed to disburse loan" }; }
}

export async function rejectApplication(applicationId: number) {
  try {
    const portfolio = await getActivePortfolio();
    await prisma.application.updateMany({ where: { id: applicationId, portfolio }, data: { status: "REJECTED" } });
    revalidatePath("/"); return { success: true };
  } catch (error: any) { return { error: error.message || "Failed to reject application" }; }
}

// 🚀 UNLEASHED AI STRATEGIST: PROFIT & INFLATION OPTIMIZED
export async function calculateOptimalDurationWithAI(principal: number, termType: string, interestRate: number = 6) {
  const totalRepayment = principal * (1 + (interestRate / 100));

  // FALLBACK MATRIX (If AI fails)
  const getFallbackDuration = (total: number, type: string) => {
    let months = Math.ceil(total / 5000);
    if (months < 1) months = 1;
    if (months > 36) months = 36; 
    if (type === "Days") return months * 30;
    if (type === "Weeks") return months * 4;
    return months;
  };

  const fallbackDuration = getFallbackDuration(totalRepayment, termType);

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return { success: true, duration: fallbackDuration };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 🚀 NEW STRATEGIC PROMPT
    const prompt = `
      You are an elite financial strategist for a highly profitable lending firm.
      Your objective is to calculate the absolute OPTIMAL LOAN DURATION.
      
      FINANCIAL DATA:
      - Principal Amount: ₱${principal}
      - Total Repayment Expected: ₱${totalRepayment}
      - Payment Frequency Requested: ${termType}

      STRATEGIC GOALS:
      1. AVOID PRINCIPAL BLEEDING: Recover capital as fast as safely possible so it can be reinvested.
      2. BEAT INFLATION: Long loan durations destroy purchasing power and profit margins. Keep durations tight.
      3. PREVENT DEFAULT: Ensure the payment amount per period remains affordable (roughly ₱3,000 - ₱8,000 per month equivalent) so the borrower does not run away.

      SCALING LOGIC:
      - Micro-Loans (Under ₱5,000): Capital must return immediately. Maximum 1 Month / 4 Weeks / 30 Days.
      - Mid-Tier Loans (₱5,000 - ₱20,000): Aim for 2 to 3 Months equivalent.
      - Large Loans (₱20,000+): Balance fast recovery against default risk. Spread it out so the monthly equivalent payment is roughly ₱5,000 to ₱8,000. 

      Based on these exact financial goals, calculate the specific number of ${termType} needed to satisfy this loan safely and profitably.
      
      Respond ONLY with the final integer number. Do not include any text, letters, commas, or symbols. Just the number.
    `;

    const result = await model.generateContent(prompt);
    const optimalDuration = parseInt(result.response.text().replace(/[^0-9]/g, ''), 10);

    if (isNaN(optimalDuration) || optimalDuration <= 0) {
      return { success: true, duration: fallbackDuration };
    }
    
    return { success: true, duration: optimalDuration };
  } catch (error: any) {
    console.error("AI Error:", error);
    return { success: true, duration: fallbackDuration };
  }
}
