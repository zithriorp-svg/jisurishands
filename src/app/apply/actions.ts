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

// Helper function to calculate days difference safely
function daysDifference(date1: Date | null | undefined, date2: Date | null | undefined): number {
  if (!date1 || !date2) return 0;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// AUM: Calculate Trust Score for existing client
async function calculateTrustScore(clientId: number): Promise<number> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      loans: {
        include: {
          installments: true
        }
      }
    }
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

      if (daysDiff > 0) {
        trustScore -= (daysDiff * 5);
      } else {
        trustScore += 2;
      }
    }
  });

  // If no payments analyzed, check for overdue accounts
  if (totalPaymentsAnalyzed === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentlyOverdue = client.loans.flatMap(l => l.installments).filter(inst => {
      return inst.status === 'PENDING' && new Date(inst.dueDate) < today;
    }).length;

    if (currentlyOverdue > 0) {
      trustScore = 50; // Penalize for overdue
    }
  }

  return Math.max(0, Math.min(100, trustScore));
}

export async function submitApplicationRecord(data: any) {
  // PRIORITY: Use targetPortfolioId (preferred) or targetPortfolio from URL param
  // Falls back to cookie for agent-initiated applications, then to default
  let portfolio: string;
  
  if (data.targetPortfolioId) {
    // Fetch portfolio name by ID
    const portfolioRecord = await prisma.systemPortfolio.findUnique({
      where: { id: parseInt(data.targetPortfolioId) }
    });
    portfolio = portfolioRecord?.name || data.targetPortfolio || await getActivePortfolio();
  } else {
    portfolio = data.targetPortfolio || await getActivePortfolio();
  }

  let score = 5;
  let summary = "AI Analysis Pending";
  let applicationStatus = "Pending"; // Default status

  // AUM: FAST-TRACK UNDERWRITING - Check if applicant is an existing client
  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { phone: data.phone },
          {
            AND: [
              { firstName: data.firstName },
              { lastName: data.lastName }
            ]
          }
        ],
        portfolio
      }
    });

    if (existingClient) {
      // Calculate Trust Score for existing client
      const trustScore = await calculateTrustScore(existingClient.id);

      if (trustScore >= 90) {
        // AUTO-APPROVE: Trust Score >= 90
        applicationStatus = "PRE-APPROVED";
        summary = `⚡ PRIME AUTO-APPROVED - Existing client with Trust Score ${trustScore}/100. Fast-tracked for immediate disbursement.`;
        score = 10; // Max score for auto-approved
      } else if (trustScore >= 70) {
        // WATCH LIST: Trust Score 70-89
        applicationStatus = "Pending";
        summary = `⚠️ RETURNING CLIENT (Trust Score: ${trustScore}/100) - Watch tier. Manual review recommended.`;
        score = Math.max(score, 6);
      } else {
        // HIGH RISK: Trust Score < 70
        applicationStatus = "Pending";
        summary = `🚨 RETURNING CLIENT (Trust Score: ${trustScore}/100) - High Risk tier. Enhanced due diligence required.`;
        score = Math.min(score, 3);
      }
    }
  } catch (lookupError) {
    console.error("Client lookup error:", lookupError);
    // Continue with normal flow if lookup fails
  }

  // Run AI analysis if not auto-approved
  if (applicationStatus !== "PRE-APPROVED") {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an elite Credit Investigator and Risk Strategist.
Perform a forensic risk analysis on this applicant based on NDI (Net Disposable Income) and Demographic Stability.

APPLICANT: ${data.firstName} ${data.lastName}
DEMOGRAPHICS: Age ${data.age || 'Unknown'} (DOB: ${data.birthDate || 'Unknown'})
CONTACT: Phone ${data.phone}, Address: ${data.address || 'Not provided'}
EMPLOYMENT: ${data.employment}
FINANCIAL DISCLOSURE:
- Gross Income: PHP ${data.income}
- Disclosed Existing Loans: ${data.existingLoansDetails || 'None disclosed'}
- Stated Monthly Debt Amortization: PHP ${data.monthlyDebtPayment || 0}
LIVING EXPENSES DATA:
- Family Details: ${data.familySize} members, ${data.workingMembers} working, ${data.students} students, ${data.infants} infants.
- Housing: ${data.housingStatus} (Rent: PHP ${data.rentAmount || 0})
- Stated Monthly Utility/Food Bills: PHP ${data.monthlyBills || 0}
SOCIAL RECON:
- Facebook: ${data.fbProfileUrl || 'Not provided'}
- Messenger: ${data.messengerId || 'Not provided'}
- Reference: ${data.referenceName} (${data.referencePhone})
DOCUMENTS RECEIVED CHECK:
- Selfie: ${data.selfieUrl ? 'RECEIVED ✓' : 'MISSING'}
- ID Photo: ${data.idPhotoUrl ? 'RECEIVED ✓' : 'MISSING'}
- Payslip: ${data.payslipPhotoUrl ? 'RECEIVED ✓' : 'MISSING'}
- Elec Bill: ${data.electricBillPhotoUrl ? 'RECEIVED ✓' : 'MISSING'}
- Water Bill: ${data.waterBillPhotoUrl ? 'RECEIVED ✓' : 'MISSING'}
- Collateral: ${data.collateralUrl ? 'RECEIVED ✓' : 'MISSING'}
- Reference: ${data.referenceName ? 'RECEIVED ✓' : 'MISSING'}
COLLATERAL OFFERED: ${data.collateralName || 'None'}. Value: PHP ${data.collateralValue || 0}, Age: ${data.collateralAge || 'N/A'}, Condition: ${data.collateralCondition || 'N/A'}, Defects: ${data.collateralDefects || 'None'}. Requested Loan: PHP ${data.principal || 0}.

YOUR TASK:
1. DEMOGRAPHIC STABILITY: Weigh Age and Family Size.
2. FORENSIC NDI CALCULATION: Stated Gross Income MINUS (Disclosed Debt Amortization + Housing + Stated Bills).
3. CRITICAL EVALUATION: If Monthly Debt + Housing + Bills > 80% of Gross Income, REJECT. If Stated Bills seem impossibly low, flag as 'Deceptive Application.'
4. APPRAISAL DIRECTIVE: If collateral is provided, act as a pawnshop appraiser. Compare the 'Collateral Value' and 'Condition' against the 'Requested Loan' amount. If the collateral's realistic resale value easily covers the loan, lower the risk rating and increase the Trust Score, even if their income is average. If they are asking for a PHP 20,000 loan but only offering a PHP 5,000 broken phone as collateral, flag this as high risk. Consider: Excellent/Good condition items retain 70-80% of stated value; Fair condition 50-60%; Poor condition 30-40%.
5. Assign a forensic Risk Score (1-10) and a summary.

Return ONLY a raw JSON object. Example:
{"score": 7, "summary": "NDI: Gross P25k - Bills P18k - Tala P3k = Net P4k. Payslip present. Collateral (iPhone 13, Good, P15k) covers P10k loan. APPROVED."}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiOutput = JSON.parse(text);
        if (aiOutput.score) score = aiOutput.score;
        if (aiOutput.summary && applicationStatus !== "PRE-APPROVED") summary = aiOutput.summary;
      }
    } catch (aiError: any) {
      if (applicationStatus !== "PRE-APPROVED") {
        summary = `Forensic Engine Offline: ${aiError.message}`;
      }
    }
  }

  try {
    await (prisma.application as any).create({
      data: {
        // Personal Information
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        address: data.address || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        age: data.age ? parseInt(data.age) : null,

        // Employment & Income
        employment: data.employment || "",
        income: parseFloat(data.income) || 0,

        // Family Demographics
        familySize: data.familySize ? parseInt(data.familySize.toString()) : null,
        workingMembers: data.workingMembers ? parseInt(data.workingMembers.toString()) : null,
        students: data.students ? parseInt(data.students.toString()) : null,
        infants: data.infants ? parseInt(data.infants.toString()) : null,

        // Housing & Living Expenses
        housingStatus: data.housingStatus || null,
        rentAmount: data.rentAmount ? parseFloat(data.rentAmount) : null,
        monthlyBills: data.monthlyBills ? parseFloat(data.monthlyBills) : null,

        // Debt Obligations
        existingLoansDetails: data.existingLoansDetails || null,
        monthlyDebtPayment: data.monthlyDebtPayment ? parseFloat(data.monthlyDebtPayment) : null,

        // References
        referenceName: data.referenceName || null,
        referencePhone: data.referencePhone || null,

        // Social Reconnaissance
        fbProfileUrl: data.fbProfileUrl || null,
        messengerId: data.messengerId || null,

        // Location
        locationLat: data.locationLat ? parseFloat(data.locationLat) : null,
        locationLng: data.locationLng ? parseFloat(data.locationLng) : null,
        locationUrl: data.locationUrl || null,

        // Document Images
        selfieUrl: data.selfieUrl || null,
        idPhotoUrl: data.idPhotoUrl || null,
        payslipPhotoUrl: data.payslipPhotoUrl || null,
        electricBillPhotoUrl: data.electricBillPhotoUrl || null,
        waterBillPhotoUrl: data.waterBillPhotoUrl || null,
        collateralUrl: data.collateralUrl || null,

        // Collateral (Palit-Sigurado) text fields
        collateralName: data.collateralName || null,
        collateralDescription: data.collateralDescription || null,
        collateralDefects: data.collateralDefects || null,
        
        // AI Appraisal Fields
        collateralValue: data.collateralValue ? parseFloat(data.collateralValue) : null,
        collateralAge: data.collateralAge || null,
        collateralCondition: data.collateralCondition || null,

        // Legal Compliance
        digitalSignature: data.digitalSignature || null,

        // Loan Configuration (Smart Configurator)
        principal: data.principal ? parseFloat(data.principal) : null,
        termType: data.termType || "Monthly",
        termDuration: data.termDuration ? parseInt(data.termDuration) : null,
        interestRate: data.interestRate ? parseFloat(data.interestRate) : 6,
        totalInterest: data.totalInterest ? parseFloat(data.totalInterest) : null,
        totalRepayment: data.totalRepayment ? parseFloat(data.totalRepayment) : null,
        perPeriodAmount: data.perPeriodAmount ? parseFloat(data.perPeriodAmount) : null,
        agentId: data.agentId ? parseInt(data.agentId) : null,

        // AI Analysis
        credibilityScore: score,
        aiRiskSummary: summary,

        // AUM: Status (Pending or PRE-APPROVED for fast-track)
        status: applicationStatus,

        // Portfolio
        portfolio
      }
    });
    revalidatePath("/");
    return {
      success: true,
      autoApproved: applicationStatus === "PRE-APPROVED",
      trustScore: score
    };
  } catch (dbError: any) {
    console.error("Vault Rejection:", dbError);
    return { error: `DATABASE REJECTION: ${dbError.message}` };
  }
}
