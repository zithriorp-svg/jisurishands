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
      where: { id: isNumeric ? parseInt(appId) : appId, portfolio }
    });
  } catch (e: any) {}

  if (!app) return <div className="p-10 text-white font-bold bg-[#09090b] min-h-screen">404: Application not found.</div>;

  const income = Number(app.income) || 0;
  const rentAmount = Number(app.rentAmount) || 0;
  const monthlyBills = Number(app.monthlyBills) || 0;
  const monthlyDebtPayment = Number(app.monthlyDebtPayment) || 0;
  const totalDeductions = rentAmount + monthlyBills + monthlyDebtPayment;
  const ndi = income - totalDeductions;
  const ndiPercentage = income > 0 ? ((ndi / income) * 100).toFixed(1) : 0;

  // 🚀 CRITICAL: We package ALL data here to send to the PDF Contract
  const appData = {
    id: app.id,
    firstName: app.firstName,
    lastName: app.lastName,
    phone: app.phone,
    address: app.address,
    referenceName: app.referenceName,
    referencePhone: app.referencePhone,
    collateralName: app.collateralName || app.collateralType,
    collateralValue: app.collateralValue ? Number(app.collateralValue) : 0,
    collateralCondition: app.collateralCondition || app.collateralDescription,
    digitalSignature: app.digitalSignature,
    
    // THE SYNC LINK: What the client actually requested
    requestedPrincipal: app.principal ? Number(app.principal) : 5000,
    requestedDuration: app.termDuration || null,
    requestedTermType: app.termType || "Months",
    requestedAgentId: app.agentId || null
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 pb-20 font-sans print:bg-white print:text-black print:min-h-0 print:p-0">
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

      <h1 className="text-3xl font-serif font-bold mb-1 print:hidden">{app.firstName} {app.lastName}</h1>
      <p className="text-gray-400 text-sm mb-4 print:hidden">{app.employment} • <span className="text-[#00df82] font-bold">₱{income.toLocaleString()}/mo</span></p>

      {/* AI Risk Analysis */}
      <div className="bg-[#1c1c21] border border-[#2a2a35] p-5 rounded-2xl mb-6 shadow-lg print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><span>🧠</span> AI Risk Analysis</h2>
        <p className="text-sm italic text-gray-300 leading-relaxed">"{app.aiRiskSummary}"</p>
      </div>

      {/* Identity Documents */}
      <div className="mb-6 print:hidden">
        <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">📄 Identity Documents</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            {app.selfieUrl ? <img src={app.selfieUrl} className="w-full h-40 object-cover rounded-xl border border-[#2a2a35]" alt="Selfie" /> : <div className="w-full h-40 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No Selfie</div>}
          </div>
          <div className="text-center">
            {app.idPhotoUrl ? <img src={app.idPhotoUrl} className="w-full h-40 object-cover rounded-xl border border-[#2a2a35]" alt="ID" /> : <div className="w-full h-40 bg-[#1c1c21] rounded-xl flex items-center justify-center text-xs text-gray-600 border border-[#2a2a35]">No ID</div>}
          </div>
        </div>
      </div>

      {/* 🚀 Passing everything to the Client & Calculator */}
      <ReviewClient appData={appData} />
    </div>
  );
}
