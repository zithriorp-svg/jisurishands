import { prisma } from "@/lib/db";
import Link from "next/link";
import { getActivePortfolio } from "@/lib/portfolio";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ error?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const appId = params.id;
  const errorMessage = searchParams?.error;
  const portfolio = await getActivePortfolio();

  let app = null;
  try {
    const isNumeric = /^\d+$/.test(appId);
    app = await prisma.application.findFirst({
      where: { 
        id: isNumeric ? parseInt(appId) : appId,
        portfolio 
      }
    });
  } catch (e: any) {}

  if (!app) return <div className="p-10 text-white font-bold bg-[#09090b] min-h-screen">404: Application not found in this portfolio.</div>;

  // Calculate NDI (Net Disposable Income)
  const income = Number(app.income) || 0;
  const rentAmount = Number(app.rentAmount) || 0;
  const monthlyBills = Number(app.monthlyBills) || 0;
  const monthlyDebtPayment = Number(app.monthlyDebtPayment) || 0;
  const totalDeductions = rentAmount + monthlyBills + monthlyDebtPayment;
  const ndi = income - totalDeductions;
  const ndiPercentage = income > 0 ? ((ndi / income) * 100).toFixed(1) : 0;

  // Serialize app data for client component
  const appData = {
    id: app.id,
    firstName: app.firstName,
    lastName: app.lastName,
    age: app.age,
    birthDate: app.birthDate?.toISOString() || null,
    phone: app.phone,
    address: app.address,
    employment: app.employment,
    income: Number(app.income),
    familySize: app.familySize,
    workingMembers: app.workingMembers,
    students: app.students,
    infants: app.infants,
    housingStatus: app.housingStatus,
    rentAmount: Number(app.rentAmount) || 0,
    monthlyBills: Number(app.monthlyBills) || 0,
    existingLoansDetails: app.existingLoansDetails,
    monthlyDebtPayment: Number(app.monthlyDebtPayment) || 0,
    referenceName: app.referenceName,
    referencePhone: app.referencePhone,
    fbProfileUrl: app.fbProfileUrl,
    messengerId: app.messengerId,
    locationLat: app.locationLat,
    locationLng: app.locationLng,
    selfieUrl: app.selfieUrl,
    idPhotoUrl: app.idPhotoUrl,
    payslipPhotoUrl: app.payslipPhotoUrl,
    electricBillPhotoUrl: app.electricBillPhotoUrl,
    waterBillPhotoUrl: app.waterBillPhotoUrl,
    collateralUrl: app.collateralUrl,
    credibilityScore: app.credibilityScore,
    aiRiskSummary: app.aiRiskSummary,
    portfolio: app.portfolio,
    // Pre-calculated values
    ndi,
    ndiPercentage,
    totalDeductions,
    // Requested Loan Configuration (for seamless disbursement)
    requestedPrincipal: app.principal ? Number(app.principal) : null,
    requestedDuration: app.termDuration || null,
    requestedTermType: app.termType || null,
    requestedAgentId: app.agentId || null
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 pb-20 font-sans print:bg-white print:text-black print:min-h-0 print:p-4">
      <div className="flex justify-between items-center mb-6 pt-2 print:hidden">
        <div>
          <Link href="/" className="text-gray-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">← Back</Link>
          <p className="text-xs text-zinc-600 mt-1">Portfolio: <span className="text-yellow-500">{portfolio}</span></p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${
          (app.credibilityScore || 0) >= 7 ? 'bg-[#00df82]/10 text-[#00df82] border-[#00df82]/30' :
          (app.credibilityScore || 0) >= 4 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
          'bg-red-500/10 text-red-500 border-red-500/30'
        }`}>
          {app.credibilityScore || '-'}
        </div>
      </div>

      {/* Personal Header */}
      <h1 className="text-3xl font-serif font-bold mb-1 print:hidden">{app.firstName} {app.lastName}</h1>
      <div className="flex flex-wrap gap-2 text-sm text-gray-400 mb-1 print:hidden">
        {app.age && <span>Age {app.age}</span>}
        {app.birthDate && <span>• DOB: {new Date(app.birthDate).toLocaleDateString()}</span>}
      </div>
      <p className="text-gray-400 text-sm mb-2">{app.employment} • <span className="text-[#00df82] font-bold">₱{income.toLocaleString()}/mo</span></p>
      {app.phone && <p className="text-gray-500 text-xs mb-1">📞 {app.phone}</p>}
      {app.address && <p className="text-gray-500 text-xs mb-4">📍 {app.address}</p>}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)] print:hidden">
          ⚠️ DATABASE REJECTION: {errorMessage}
        </div>
      )}

      {/* AI Risk Analysis */}
      <div className="bg-[#1c1c21] border border-[#2a2a35] p-5 rounded-2xl mb-6 shadow-lg print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
          <span>🧠</span> AI Risk Analysis
        </h2>
        <p className="text-sm italic text-gray-300 leading-relaxed">"{app.aiRiskSummary}"</p>
      </div>

      {/* Financial Breakdown */}
      <div className="mb-6 bg-[#0f0f13] border border-[#2a2a35] rounded-2xl p-4 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">💰 Financial Breakdown (NDI Analysis)</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">Gross Monthly Income</span>
            <span className="text-[#00df82] font-bold">₱{income.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">Housing ({app.housingStatus || 'N/A'})</span>
            <span className="text-red-400">-₱{rentAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">Monthly Bills (Utilities/Food)</span>
            <span className="text-red-400">-₱{monthlyBills.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">Debt Amortization</span>
            <span className="text-red-400">-₱{monthlyDebtPayment.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-2 border-t-2 border-[#00df82]/30">
            <span className="text-white font-bold">Net Disposable Income</span>
            <span className={ndi >= 0 ? 'text-[#00df82] font-black text-lg' : 'text-red-500 font-black text-lg'}>
              ₱{ndi.toLocaleString()} ({ndiPercentage}%)
            </span>
          </div>
          {app.existingLoansDetails && (
            <div className="mt-2 pt-2 border-t border-[#2a2a35]">
              <span className="text-yellow-500 text-xs">⚠️ Existing Loans: {app.existingLoansDetails}</span>
            </div>
          )}
        </div>
      </div>

      {/* Family Demographics */}
      <div className="mb-6 bg-[#0f0f13] border border-[#2a2a35] rounded-2xl p-4 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">👨‍👩‍👧‍👦 Family Demographics</h2>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="bg-[#1c1c21] p-2 rounded-lg">
            <div className="text-lg font-bold text-white">{app.familySize || '-'}</div>
            <div className="text-xs text-gray-500">Family</div>
          </div>
          <div className="bg-[#1c1c21] p-2 rounded-lg">
            <div className="text-lg font-bold text-[#00df82]">{app.workingMembers || '-'}</div>
            <div className="text-xs text-gray-500">Working</div>
          </div>
          <div className="bg-[#1c1c21] p-2 rounded-lg">
            <div className="text-lg font-bold text-yellow-500">{app.students || '-'}</div>
            <div className="text-xs text-gray-500">Students</div>
          </div>
          <div className="bg-[#1c1c21] p-2 rounded-lg">
            <div className="text-lg font-bold text-red-400">{app.infants || '-'}</div>
            <div className="text-xs text-gray-500">Infants</div>
          </div>
        </div>
      </div>

      {/* Social Reconnaissance */}
      <div className="mb-6 bg-[#0f0f13] border border-[#2a2a35] rounded-2xl p-4 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">🔍 Social Reconnaissance</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">Facebook Profile</span>
            {app.fbProfileUrl ? 
              <a href={app.fbProfileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline truncate max-w-[180px]">View Profile ↗</a> : 
              <span className="text-gray-600">Not provided</span>
            }
          </div>
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">Messenger ID</span>
            <span className="text-gray-300">{app.messengerId || 'Not provided'}</span>
          </div>
          <div className="flex justify-between border-b border-[#2a2a35] pb-2">
            <span className="text-gray-400">GPS Location</span>
            {app.locationLat && app.locationLng ?
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${app.locationLat},${app.locationLng}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00df82] hover:text-[#00df82]/80 underline flex items-center gap-1">
                📍 Open Map ↗
              </a>
            : <span className="text-gray-600">Bypassed</span>}
          </div>
        </div>
      </div>

      {/* Character Reference */}
      <div className="mb-6 bg-[#0f0f13] border border-[#2a2a35] rounded-2xl p-4 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">👤 Character Reference</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span className="text-white font-bold">{app.referenceName || 'Not provided'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Phone</span>
            <span className="text-gray-300">{app.referencePhone || 'Not provided'}</span>
          </div>
        </div>
      </div>

      {/* Identity Documents */}
      <div className="mb-6 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">📄 Identity Documents</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Selfie</p>
            {app.selfieUrl ?
              <img src={app.selfieUrl} className="w-full h-40 object-cover rounded-xl border border-[#2a2a35]" alt="Selfie" /> :
              <div className="w-full h-40 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No Selfie</div>
            }
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Valid ID</p>
            {app.idPhotoUrl ?
              <img src={app.idPhotoUrl} className="w-full h-40 object-cover rounded-xl border border-[#2a2a35]" alt="ID" /> :
              <div className="w-full h-40 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No ID</div>
            }
          </div>
        </div>
      </div>

      {/* Supporting Documents */}
      <div className="mb-6 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">📋 Supporting Documents</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Payslip</p>
            {app.payslipPhotoUrl ?
              <img src={app.payslipPhotoUrl} className="w-full h-32 object-cover rounded-xl border border-[#2a2a35]" alt="Payslip" /> :
              <div className="w-full h-32 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No Payslip</div>
            }
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Electric Bill</p>
            {app.electricBillPhotoUrl ?
              <img src={app.electricBillPhotoUrl} className="w-full h-32 object-cover rounded-xl border border-[#2a2a35]" alt="Electric Bill" /> :
              <div className="w-full h-32 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No Electric Bill</div>
            }
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Water Bill</p>
            {app.waterBillPhotoUrl ?
              <img src={app.waterBillPhotoUrl} className="w-full h-32 object-cover rounded-xl border border-[#2a2a35]" alt="Water Bill" /> :
              <div className="w-full h-32 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No Water Bill</div>
            }
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Collateral</p>
            {app.collateralUrl ?
              <img src={app.collateralUrl} className="w-full h-32 object-cover rounded-xl border border-[#2a2a35]" alt="Collateral" /> :
              <div className="w-full h-32 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No Collateral</div>
            }
          </div>
        </div>
      </div>

      {/* Loan Calculator & Disbursement */}
      <ReviewClient 
        applicationId={app.id} 
        applicantName={`${app.firstName} ${app.lastName}`}
        suggestedIncome={income}
        referenceName={app.referenceName}
        referencePhone={app.referencePhone}
        requestedPrincipal={app.principal ? Number(app.principal) : null}
        requestedDuration={app.termDuration || null}
        requestedTermType={app.termType || null}
        requestedAgentId={app.agentId || null}
      />
    </div>
  );
}
