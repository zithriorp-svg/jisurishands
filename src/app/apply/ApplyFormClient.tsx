"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { submitApplicationRecord } from "./actions";
import SignaturePad from "@/components/SignaturePad";

interface Agent {
  id: number;
  name: string;
  portfolio?: string | null;
}

interface Portfolio {
  id: number;
  name: string;
}

interface ApplyFormClientProps {
  agents: Agent[];
  portfolios: Portfolio[];
}

export default function ApplyFormClient({ agents, portfolios }: ApplyFormClientProps) {
  const searchParams = useSearchParams();
  
  const urlPortfolioId = searchParams.get('portfolioId');
  const urlPortfolioName = searchParams.get('portfolio');
  
  const targetPortfolio = urlPortfolioId 
    ? portfolios.find(p => p.id === parseInt(urlPortfolioId))
    : urlPortfolioName 
      ? portfolios.find(p => p.name === urlPortfolioName) || portfolios[0]
      : portfolios[0];
  
  const targetPortfolioId = targetPortfolio?.id || null;
  const targetPortfolioName = targetPortfolio?.name || "Main Portfolio";
  
  const availableAgents = agents.filter(agent => {
    const agentPort = agent.portfolio || "Main Portfolio";
    return agentPort.toLowerCase() === targetPortfolioName.toLowerCase();
  });
  
  const [principal, setPrincipal] = useState<number>(0);
  const [termType, setTermType] = useState<string>("Weeks");
  const [agentId, setAgentId] = useState<string>("");

  // 🚀 UPGRADE: Fully manual, adjustable interest rates!
  const [manualOfficialRate, setManualOfficialRate] = useState<number>(10);
  const [manualDiscountedRate, setManualDiscountedRate] = useState<number>(6);

  const baseInterestRate = manualOfficialRate / 100;
  const effectiveRate = manualDiscountedRate / 100;
  const discountRate = baseInterestRate - effectiveRate;

  const baseInterest = principal * baseInterestRate;
  const discountAmount = principal * discountRate;
  const netInterest = principal * effectiveRate;
  
  const getOptimalDuration = (principal: number, termType: string): number => {
    if (principal <= 5000) {
      if (termType === "Days") return 30;
      if (termType === "Weeks") return 4;
      return 1;
    } else {
      if (termType === "Days") return 60;
      if (termType === "Weeks") return 8;
      return 2;
    }
  };
  
  const optimalDuration = getOptimalDuration(principal, termType);
  const totalDue = principal + netInterest;
  const perPeriod = optimalDuration > 0 ? totalDue / optimalDuration : 0;

  const generateSchedule = () => {
    if (!principal || principal <= 0 || !optimalDuration) return [];
    
    const schedule = [];
    let remainingPrincipalToDistribute = principal;
    let remainingInterestToDistribute = netInterest;
    
    for (let i = 1; i <= optimalDuration; i++) {
      const date = new Date();
      if (termType === 'Days') {
        date.setDate(date.getDate() + i);
      } else if (termType === 'Weeks') {
        date.setDate(date.getDate() + (i * 7));
      } else if (termType === 'Months') {
        date.setMonth(date.getMonth() + i);
      }
      
      const isLastPeriod = (i === optimalDuration);
      let strictPrincipal = 0;
      let strictInterest = 0;

      if (isLastPeriod) {
        strictPrincipal = Number(remainingPrincipalToDistribute.toFixed(2));
        strictInterest = Number(remainingInterestToDistribute.toFixed(2));
      } else {
        strictPrincipal = Number((principal / optimalDuration).toFixed(2));
        strictInterest = Number((netInterest / optimalDuration).toFixed(2));
        
        remainingPrincipalToDistribute -= strictPrincipal;
        remainingInterestToDistribute -= strictInterest;
      }

      const strictTotalAmount = Number((strictPrincipal + strictInterest).toFixed(2));
      
      const remainingBalanceBeforeThisPayment = isLastPeriod 
        ? strictTotalAmount 
        : Number(((remainingPrincipalToDistribute + remainingInterestToDistribute) + strictTotalAmount).toFixed(2));
      
      const finalRemainingBalance = isLastPeriod ? 0 : Number((remainingBalanceBeforeThisPayment - strictTotalAmount).toFixed(2));

      schedule.push({
        period: i,
        dateStr: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        principal: strictPrincipal,
        interest: strictInterest,
        total: strictTotalAmount,
        balance: finalRemainingBalance
      });
    }
    return schedule;
  };

  const amortizationSchedule = generateSchedule();
  
  const [formData, setFormData] = useState<any>({
    firstName: "", lastName: "", phone: "", address: "",
    birthDate: "", age: "",
    employment: "", income: "", fbProfileUrl: "", messengerId: "",
    familySize: "1", workingMembers: "1", students: "0", infants: "0",
    housingStatus: "Owned", rentAmount: "", monthlyBills: "",
    existingLoansDetails: "", monthlyDebtPayment: "",
    referenceName: "", referencePhone: "",
    locationLat: "", locationLng: "", locationUrl: "",
    selfieUrl: "", idPhotoUrl: "",
    payslipPhotoUrl: "", electricBillPhotoUrl: "", waterBillPhotoUrl: "",
    collateralType: "", collateralValue: "", collateralCondition: "",
    collateralPhotoFront: "", collateralPhotoRear: "", collateralPhotoLeft: "",
    collateralPhotoRight: "", collateralPhotoSerial: "", collateralPhotoDocument: "",
    digitalSignature: ""
  });

  const [status, setStatus] = useState("");
  const [locStatus, setLocStatus] = useState("Locating...");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const geoOptions = { timeout: 3000, maximumAge: 10000, enableHighAccuracy: false };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev: any) => ({...prev, locationLat: pos.coords.latitude, locationLng: pos.coords.longitude}));
          setLocStatus("Location Verified ✓");
        },
        () => setLocStatus("Location Bypassed"),
        geoOptions
      );
    } else {
      setLocStatus("Location Bypassed");
    }
  }, []);

  const handleImage = (e: any, field: string) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
        setFormData((prev: any) => ({...prev, [field]: compressedBase64}));
      };
    };
  };

  const calculateAge = (bday: string) => {
    if (!bday) return;
    const birthDate = new Date(bday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    setFormData((prev: any) => ({...prev, birthDate: bday, age: age}));
  };

  const selectedAgentName = availableAgents.find(a => a.id === parseInt(agentId))?.name || "No Agent Assigned";

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setStatus("UPLOADING FORENSIC DOSSIER...");
    try {
      const res = await submitApplicationRecord({ 
        ...formData, 
        targetPortfolio: targetPortfolioName,
        targetPortfolioId: targetPortfolioId,
        principal,
        termType,
        termDuration: optimalDuration,
        // 🚀 UPGRADE: Passing the manually selected discounted rate to the database
        interestRate: manualDiscountedRate, 
        totalInterest: netInterest,
        totalRepayment: totalDue,
        perPeriodAmount: perPeriod,
        agentId: agentId ? parseInt(agentId) : null
      });
      if (res?.error) throw new Error(res.error);
      setIsSubmitted(true);
      setStatus("");
    } catch (error: any) {
      alert("Matrix Error: " + error.message);
      setStatus("");
    }
  };

  const rapidInputStyle = "w-full bg-transparent p-3 text-sm border-b border-[#2a2a35] outline-none text-white appearance-none";
  const borderStyle = "border border-[#2a2a35] bg-[#0f0f13]";
  const headerStyle = "text-blue-600 font-bold text-lg mb-3 uppercase tracking-wider";
  const currentDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#09090b] text-center p-8 flex flex-col items-center justify-center print:bg-white print:p-0">
        <div className="print:hidden w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✓</div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Received!</h1>
          <p className="text-zinc-400 text-sm mb-8">Your dossier has been securely transmitted. Please save a copy of your contract receipt now.</p>
          
          <button onClick={() => window.print()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mb-4 transition-all shadow-lg flex items-center justify-center gap-2">
            📄 SAVE PDF RECEIPT
          </button>
          
          <button onClick={() => window.location.href = '/'} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all">
            Return to Home
          </button>
        </div>

        <div className="hidden print:block text-black w-full text-left font-sans">
          <div className="border-b-2 border-black pb-4 mb-4 text-center">
            <h1 className="text-2xl font-bold">LOAN APPLICATION RECEIPT</h1>
            <p className="text-sm text-gray-600">Official Document • {currentDate}</p>
            <p className="text-xs text-gray-500 mt-1">Portfolio: {targetPortfolioName}</p>
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">BORROWER INFORMATION</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 break-inside-avoid">
            <div className="font-semibold">Full Name:</div><div>{formData.firstName} {formData.lastName}</div>
            <div className="font-semibold">Phone:</div><div>{formData.phone || '—'}</div>
            <div className="font-semibold">Address:</div><div>{formData.address || '—'}</div>
            <div className="font-semibold">Birth Date:</div><div>{formData.birthDate || '—'}</div>
            <div className="font-semibold">Age:</div><div>{formData.age || '—'}</div>
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">FINANCIAL INFORMATION</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 break-inside-avoid">
            <div className="font-semibold">Employment/Business:</div><div>{formData.employment || '—'}</div>
            <div className="font-semibold">Gross Income:</div><div>₱{formData.income || '—'}</div>
            <div className="font-semibold">Existing Loans:</div><div>{formData.existingLoansDetails || 'None declared'}</div>
            <div className="font-semibold">Monthly Debt Payment:</div><div>₱{formData.monthlyDebtPayment || '0'}</div>
            <div className="font-semibold">Family Size:</div><div>{formData.familySize}</div>
            <div className="font-semibold">Working Members:</div><div>{formData.workingMembers}</div>
            <div className="font-semibold">Housing Status:</div><div>{formData.housingStatus}</div>
            <div className="font-semibold">Monthly Bills:</div><div>₱{formData.monthlyBills || '—'}</div>
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4 mt-6">AMORTIZATION SCHEDULE</h2>
          <div className="border border-black mb-6">
            <div className="bg-gray-100 p-2 text-xs font-bold text-black flex justify-between uppercase tracking-wider border-b border-black">
              <span className="w-16">Period</span>
              <span className="w-24">Due Date</span>
              <span className="w-28 text-right">Payment</span>
              <span className="w-28 text-right">Balance</span>
            </div>
            {amortizationSchedule.map((row) => (
              <div key={row.period} className="p-2 border-b border-gray-300 flex justify-between text-sm text-black">
                <span className="w-16">{row.period} {termType.slice(0, -1)}</span>
                <span className="w-24 text-xs">{row.dateStr}</span>
                <span className="w-28 text-right font-bold">₱{row.total.toFixed(2)}</span>
                <span className="w-28 text-right">₱{row.balance.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">SOCIAL & REFERENCE</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 break-inside-avoid">
            <div className="font-semibold">Facebook Profile:</div><div className="break-all">{formData.fbProfileUrl || '—'}</div>
            <div className="font-semibold">Google Maps:</div><div className="break-all">{formData.locationUrl || '—'}</div>
            <div className="font-semibold">Reference Name:</div><div>{formData.referenceName || '—'}</div>
            <div className="font-semibold">Reference Phone:</div><div>{formData.referencePhone || '—'}</div>
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase">Pledged Collateral Declaration</h2>
          <div className="grid grid-cols-2 gap-y-1 text-sm mb-4">
            <div className="font-semibold">Asset Type:</div><div>{formData.collateralType || '—'}</div>
            <div className="font-semibold">Market Value:</div><div>₱{formData.collateralValue || '—'}</div>
            <div className="font-semibold col-span-2 mt-1">Specifications & Condition:</div>
            <div className="col-span-2">{formData.collateralCondition || '—'}</div>
          </div>

          <div className="print:block print:w-full print:h-auto print:overflow-visible whitespace-normal">
            <h2 className="font-bold text-lg border-b border-black pb-2 mb-4 mt-6">LEGAL COMPLIANCE & CONSENT</h2>
            <div className="bg-transparent text-black text-xs leading-relaxed mb-6 whitespace-normal">
              <p className="font-bold text-black mb-2 uppercase tracking-wider">DATA PRIVACY & CONSENT WAIVER</p>
              <p className="mb-2 break-words text-black">By signing below, I hereby authorize the lending institution to collect, process, and store my personal and financial information for the purpose of evaluating my loan application.</p>
              <p className="mb-2 break-words text-black">I understand that my data may be shared with third-party verification services and credit bureaus for authentication and risk assessment purposes.</p>
              <p className="mb-2 break-words text-black">I certify that all information provided in this application is true and accurate to the best of my knowledge. I acknowledge that any false statement may result in immediate rejection of my application and potential legal action.</p>
              <p className="break-words text-black">I agree to the terms and conditions of the loan agreement, including but not limited to: interest rates, repayment schedules, and penalties for late or non-payment.</p>
            </div>

            <div className="bg-transparent text-black text-sm mb-6 whitespace-normal">
              <h3 className="font-bold text-black text-base mb-3 border-b border-black pb-2">MGA TUNTUNIN AT KUNDISYON (Terms and Conditions)</h3>
              <ol className="list-decimal pl-5 space-y-2 break-words">
                <li className="break-words text-black">
                  <strong>INTERES AT GOOD PAYER DISCOUNT:</strong> Ang opisyal na flat-rate interest ng utang na ito ay <strong>{manualOfficialRate}%</strong>. PERO, kung ang NANGUTANG ay magbabayad ng tama sa oras sa lahat ng kanyang iskedul, siya ay bibigyan ng <strong>{Math.round(manualOfficialRate - manualDiscountedRate)}% Good Payer Discount</strong> (kaya magiging {manualDiscountedRate}% na lamang ang epektibong interes).
                  <br/>
                  <span className="text-gray-600 text-xs italic mt-1 block">
                    (Simpleng paliwanag: Kung palagi kang on-time, {manualDiscountedRate}% lang ang tubo ng utang mo. Pero kapag na-late ka kahit isang araw sa iyong hulog, ma-vo-void ang discount at sisingilin ka ng buong {manualOfficialRate}% interes para sa buong kontrata.)
                  </span>
                </li>
                <li className="break-words text-black">
                  <strong>LOAN EXTENSION (ROLLOVER):</strong> Kung sakaling matapos ang kontrata at hindi pa kayang bayaran ng buo ang utang, ang NANGUTANG ay maaaring humingi ng palugit (Rollover). Upang ma-extend ang utang, kailangang magbayad ng <strong>Extension Fee</strong> na katumbas ng {manualDiscountedRate}% ng orihinal na Principal.
                  <br/>
                  <span className="text-gray-600 text-xs italic mt-1 block">
                    (Simpleng paliwanag: Kung ₱20,000 ang utang mo at hindi mo mabayaran sa due date, kailangan mong magbayad ng ₱{Math.round(20000 * (manualDiscountedRate/100))} Extension Fee para mabigyan ka ng panibagong palugit. Ang ₱{Math.round(20000 * (manualDiscountedRate/100))} na ito ay fee lamang at HINDI ibabawas sa utang mong ₱20,000.)
                  </span>
                </li>
                <li className="break-words text-black">Ang nag PAUTANG ay may karapatang mangolekta o maningil ng utang sa pamamagitan ng mga lehitimong paraan tulad ng pagbisita sa bahay, pagtawag, o pagsulat ng liham.</li>
                <li className="break-words text-black">Ang mga impormasyong ibinigay ng NANGUTANG ay totoo at tama. Ang anumang maling impormasyon ay maaaring maging dahilan ng agarang pagbabayad ng buong halaga.</li>
                <li className="break-words text-black">Ang kasunduang ito ay sumasailalim sa batas ng Republika ng Pilipinas.</li>
                <li className="break-words text-black">Sa kaso ng hindi pagbabayad, ang NANGUTANG ay sumasang-ayon na maaaring isama ang kanyang pangalan sa lista ng mga delinquent borrowers.</li>
                <li className="break-words text-black">Ang pagpirma sa kasunduang ito ay patunay na ang NANGUTANG ay nagkasundo at sumasang-ayon sa lahat ng tuntunin at kundisyon.</li>
              </ol>
            </div>
          </div>

          {formData.digitalSignature && (
            <div className="mt-4 pt-2 border-t border-black print:break-inside-avoid">
              <h2 className="font-bold text-lg mb-2 uppercase">Digital Signature</h2>
              <div className="border border-gray-400 p-2 inline-block">
                <img src={formData.digitalSignature} alt="Digital Signature" style={{ maxHeight: '80px', filter: 'invert(1) contrast(200%)' }} />
              </div>
            </div>
          )}

          <div style={{ pageBreakBefore: 'always' }} className="pt-8">
            <h2 className="text-2xl font-bold text-black mb-1 text-center">APPENDIX A: FORENSIC & COLLATERAL EVIDENCE</h2>
            <p className="text-sm text-gray-600 text-center mb-4 border-b-2 border-black pb-4">Applicant: {formData.firstName} {formData.lastName}</p>

            <h3 className="font-bold text-lg mb-2 uppercase bg-gray-200 p-2">Identity Verification</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {formData.selfieUrl && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">LIVE SELFIE</p><img src={formData.selfieUrl} className="w-full h-40 object-contain" /></div>}
              {formData.idPhotoUrl && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">GOVERNMENT ID</p><img src={formData.idPhotoUrl} className="w-full h-40 object-contain" /></div>}
            </div>

            <h3 className="font-bold text-lg mb-2 uppercase bg-gray-200 p-2">6-Point Collateral Inspection</h3>
            <div className="grid grid-cols-2 gap-4">
              {formData.collateralPhotoFront && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">FRONT VIEW</p><img src={formData.collateralPhotoFront} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoRear && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">REAR VIEW</p><img src={formData.collateralPhotoRear} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoLeft && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">LEFT VIEW</p><img src={formData.collateralPhotoLeft} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoRight && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">RIGHT VIEW</p><img src={formData.collateralPhotoRight} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoSerial && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">SERIAL / PLATE</p><img src={formData.collateralPhotoSerial} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoDocument && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">TITLE / ORCR</p><img src={formData.collateralPhotoDocument} className="w-full h-40 object-contain" /></div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-300 p-4 font-sans pb-20 print:hidden">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 pt-4">
          <h1 className="text-3xl font-serif font-bold text-gray-200 mb-2">Digital Loan<br/>Application</h1>
          <span className="bg-purple-900/30 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-3">
            DIVISION: {targetPortfolioName}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-md shadow-lg">
            <h3 className="font-bold text-white mb-4 border-b border-zinc-700 pb-2 uppercase tracking-wider text-sm">
              💰 LOAN CONFIGURATION
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 block mb-1">Assigned Agent / Co-Maker (Optional)</label>
                <select name="agentId" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm">
                  <option value="">No Agent Assigned</option>
                  {availableAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Term Type</label>
                <select name="termType" value={termType} onChange={(e) => setTermType(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm">
                  <option value="Days">Daily Payments</option>
                  <option value="Weeks">Weekly Payments</option>
                  <option value="Months">Monthly Payments</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Principal Amount (₱)</label>
                <input type="number" name="principal" value={principal || ""} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm" placeholder="e.g. 5000" required min="100" />
              </div>
              
              {/* 🚀 UPGRADE: Manual Rate Controls */}
              <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-[#1c1c21] rounded border border-zinc-800 mt-2">
                 <div>
                   <label className="text-[10px] text-red-400 font-bold uppercase tracking-widest block mb-1">Official Rate (%)</label>
                   <input type="number" value={manualOfficialRate} onChange={(e) => setManualOfficialRate(Number(e.target.value))} className="w-full bg-black border border-red-900/50 rounded p-2 text-red-400 text-sm" />
                 </div>
                 <div>
                   <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mb-1">Discounted Rate (%)</label>
                   <input type="number" value={manualDiscountedRate} onChange={(e) => setManualDiscountedRate(Number(e.target.value))} className="w-full bg-black border border-emerald-900/50 rounded p-2 text-emerald-400 text-sm font-bold" />
                 </div>
                 <div className="col-span-2 text-[10px] text-zinc-500 italic mt-1">
                   * Schedule generated at {manualDiscountedRate}% (Good Payer Discount). If client defaults, rate reverts to {manualOfficialRate}% per contract.
                 </div>
              </div>
            </div>

            <div className="bg-black p-4 rounded border border-zinc-800 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-400 text-sm">Principal Amount:</span>
                <span className="text-white font-bold">₱{principal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-400 text-sm">Assigned Agent:</span>
                <span className="text-emerald-400 font-bold">{selectedAgentName}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-400 text-sm">Payment Schedule:</span>
                <span className="text-emerald-400 font-bold">{termType === 'Days' ? 'Daily' : termType === 'Weeks' ? 'Weekly' : 'Monthly'} Payments</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-400 text-sm">Optimal Duration:</span>
                <span className="text-emerald-400 font-bold">{optimalDuration} {termType.slice(0, -1)}{optimalDuration > 1 ? 's' : ''}</span>
              </div>
              
              <div className="border-t border-zinc-700 pt-3 mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 text-sm">Official Interest ({manualOfficialRate}%):</span>
                  <span className="text-red-400 line-through">₱{baseInterest.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-zinc-700">
                  <span className="text-emerald-400 text-sm font-bold">⭐ Good Payer Discount (-{Math.round((discountRate)*100)}%):</span>
                  <span className="text-emerald-400 font-bold">- ₱{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-300 text-sm">Net Interest (If paid on time):</span>
                  <span className="text-white font-medium">₱{netInterest.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-2 pt-2">
                <span className="text-zinc-300 text-sm">Total Repayment:</span>
                <span className="text-white font-bold">₱{totalDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800 bg-emerald-900/20 p-2 rounded mt-2">
                <span className="text-zinc-300 text-sm font-bold">Discounted {termType === 'Days' ? 'Daily' : termType === 'Weeks' ? 'Weekly' : 'Monthly'} Payment:</span>
                <span className="text-emerald-400 font-bold text-lg">₱{perPeriod.toFixed(2)}</span>
              </div>
              
              {amortizationSchedule.length > 0 && (
                <div className="mt-4 border border-zinc-700 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800 p-2 flex justify-between items-center">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">📅 AMORTIZATION SCHEDULE</h4>
                  </div>
                  <div className="bg-zinc-900 p-2 text-[10px] font-bold text-zinc-400 flex justify-between uppercase tracking-wider border-b border-zinc-800">
                    <span className="w-12">Period</span>
                    <span className="w-20">Due Date</span>
                    <span className="w-20 text-right">Payment</span>
                    <span className="w-20 text-right">Balance</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {amortizationSchedule.map((row) => (
                      <div key={row.period} className="p-2 border-b border-zinc-800/50 flex justify-between text-xs bg-black">
                        <span className="w-12 text-zinc-400">{row.period} {termType.slice(0, -1)}</span>
                        <span className="w-20 text-zinc-300 text-[10px] flex items-center">{row.dateStr}</span>
                        <span className="w-20 text-right text-emerald-400 font-bold">₱{row.total.toFixed(2)}</span>
                        <span className="w-20 text-right text-white font-medium">₱{row.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className={headerStyle}>1. Personal & Demographic Matrix</h2>
            <div className={`grid grid-cols-2 gap-0 ${borderStyle}`}>
              <input name="firstName" required placeholder="First Name" className={`${rapidInputStyle} border-r`} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              <input name="lastName" required placeholder="Last Name" className={rapidInputStyle} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              <input name="birthDate" required type="text" placeholder="Birth Date (YYYY-MM-DD)" className={`${rapidInputStyle} border-r text-gray-400`} onChange={e => calculateAge(e.target.value)} />
              <input name="age" readOnly placeholder="Age" value={formData.age ? `Age: ${formData.age}` : ""} className={`${rapidInputStyle} text-[#00df82]`} />
              <input name="phone" required placeholder="Phone Number" className={`${rapidInputStyle} col-span-2`} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input name="address" required placeholder="Current Address" className={`${rapidInputStyle} col-span-2 border-b-0`} onChange={e => setFormData({...formData, address: e.target.value})} />
              
              <div className="col-span-2 p-3 bg-[#1c1c21] text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-[#2a2a35]">Social Recon & Emergency Reference</div>
              <input name="fbProfileUrl" required placeholder="Facebook Profile Link (https://www.facebook.com/share/...)" className={`${rapidInputStyle} col-span-2 text-blue-400`} onChange={e => setFormData({...formData, fbProfileUrl: e.target.value})} />
              <input name="locationUrl" required placeholder="Google Maps Link (https://maps.app.goo.gl/...)" className={`${rapidInputStyle} col-span-2 text-emerald-400`} onChange={e => setFormData({...formData, locationUrl: e.target.value})} />
              <input name="referenceName" required placeholder="Reference Name" className={`${rapidInputStyle} border-r border-b-0`} onChange={e => setFormData({...formData, referenceName: e.target.value})} />
              <input name="referencePhone" required placeholder="Reference Phone Number" className={`${rapidInputStyle} border-b-0`} onChange={e => setFormData({...formData, referencePhone: e.target.value})} />
            </div>
          </div>

          <div>
            <h2 className={headerStyle}>2. Financial Interrogation & Capacity</h2>
            <div className={`grid grid-cols-2 gap-0 ${borderStyle}`}>
              <input name="employment" required placeholder="Employment / Business Name" className={`${rapidInputStyle} col-span-2`} onChange={e => setFormData({...formData, employment: e.target.value})} />
              <input name="income" required type="number" placeholder="Gross Income (₱)" className={`${rapidInputStyle} col-span-2 text-[#00df82] font-black`} onChange={e => setFormData({...formData, income: e.target.value})} />
              <input name="existingLoansDetails" placeholder="Existing Loans? (Banks/Apps like Tala)" className={`${rapidInputStyle} col-span-2 text-yellow-500`} onChange={e => setFormData({...formData, existingLoansDetails: e.target.value})} />
              <input name="monthlyDebtPayment" type="number" placeholder="Combined Monthly Amortization (₱)" className={`${rapidInputStyle} col-span-2 text-red-400`} onChange={e => setFormData({...formData, monthlyDebtPayment: e.target.value})} />
              <div className="col-span-2 p-3 bg-[#1c1c21] text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-[#2a2a35]">Living Expenses</div>
              <select name="familySize" defaultValue="1" className={`${rapidInputStyle} border-r text-gray-400`} onChange={e => setFormData({...formData, familySize: e.target.value})}>
                {[1,2,3,4,5,"6+"].map(n => <option key={n} value={n}>Family Size: {n}</option>)}
              </select>
              <select name="workingMembers" defaultValue="1" className={`${rapidInputStyle} text-gray-400`} onChange={e => setFormData({...formData, workingMembers: e.target.value})}>
                {[1,2,3,4,"5+"].map(n => <option key={n} value={n}>Working Members: {n}</option>)}
              </select>
              <select name="students" defaultValue="0" className={`${rapidInputStyle} border-r text-gray-400`} onChange={e => setFormData({...formData, students: e.target.value})}>
                {[0,1,2,3,4,5,"6+"].map(n => <option key={n} value={n}>Students: {n}</option>)}
              </select>
              <select name="infants" defaultValue="0" className={`${rapidInputStyle} text-gray-400`} onChange={e => setFormData({...formData, infants: e.target.value})}>
                {[0,1,2,3,"4+"].map(n => <option key={n} value={n}>Infants/Toddlers: {n}</option>)}
              </select>
              <select name="housingStatus" className={`${rapidInputStyle} border-r text-gray-400`} onChange={e => setFormData({...formData, housingStatus: e.target.value})}>
                <option value="Owned">Housing: Owned</option>
                <option value="Renting">Housing: Renting</option>
                <option value="Relatives">Housing: Relatives</option>
              </select>
              <input name="rentAmount" type="number" placeholder="Rent/mo (If Renting)" className={`${rapidInputStyle}`} onChange={e => setFormData({...formData, rentAmount: e.target.value})} />
              <input name="monthlyBills" required type="number" placeholder="Est. Monthly Utility & Food Bills (₱)" className={`${rapidInputStyle} col-span-2 text-red-400 border-b-0`} onChange={e => setFormData({...formData, monthlyBills: e.target.value})} />
            </div>
          </div>

          <div>
            <h2 className="text-[#00df82] font-bold text-lg mb-3 uppercase tracking-wider">3. Forensic Verification Dossier</h2>
            <div className={`${borderStyle} p-4 space-y-4`}>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {[
                  {field: 'selfieUrl', label: 'Live Selfie (capture)', required: true},
                  {field: 'idPhotoUrl', label: 'Valid ID (Required)', required: true},
                  {field: 'payslipPhotoUrl', label: 'Payment Slip / Payslip (Required)', required: true},
                  {field: 'electricBillPhotoUrl', label: 'Electricity Bill (Proof of Address)', required: false},
                  {field: 'waterBillPhotoUrl', label: 'Water Bill', required: false}
                ].map(item => (
                  <div key={item.field} className="bg-[#1c1c21] border border-[#2a2a35] rounded-lg p-3">
                    <label className="block text-gray-400 text-xs mb-1 uppercase tracking-widest">{item.label}</label>
                    <input name={item.field} type="file" accept="image/*" capture={item.field === 'selfieUrl' ? 'user' : undefined} required={item.required} className="w-full text-xs text-gray-500" onChange={e => handleImage(e, item.field)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-purple-400 font-bold text-lg mb-1 uppercase tracking-wider">4. Pledged Collateral Declaration</h2>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">Provide details of the asset you are pledging as a guarantee against your loan.</p>
            <div className={`${borderStyle} p-4 space-y-4`}>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-1">Asset Type</label>
                <select required name="collateralType" className="w-full bg-black border border-zinc-800 rounded p-3 text-white text-sm" value={formData.collateralType} onChange={e => setFormData({...formData, collateralType: e.target.value})}>
                  <option value="">Select Category...</option>
                  <option value="Electronics">Electronics (Laptop, Phone, Tablet)</option>
                  <option value="Vehicle">Vehicle (Motorcycle, Car)</option>
                  <option value="Real Estate">Real Estate / Land</option>
                  <option value="Other">Other Valuable Asset</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-1">Estimated Market Value (₱)</label>
                <input required type="number" name="collateralValue" placeholder="e.g. 150000" className="w-full bg-black border border-zinc-800 rounded p-3 text-white text-sm" onChange={e => setFormData({...formData, collateralValue: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-1">Asset Specifications & Condition</label>
                <textarea required rows={3} name="collateralCondition" placeholder="Include Make, Model, Year, Serial Number, OR/CR Number..." className="w-full bg-black border border-zinc-800 rounded p-3 text-white text-sm" onChange={e => setFormData({...formData, collateralCondition: e.target.value})}></textarea>
              </div>
              
              <div className="pt-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-3">Asset Photographic Evidence</label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    {field: 'collateralPhotoFront', label: '📸 FRONT VIEW'},
                    {field: 'collateralPhotoRear', label: '📸 REAR / SIDE VIEW'},
                    {field: 'collateralPhotoLeft', label: '📸 LEFT VIEW'},
                    {field: 'collateralPhotoRight', label: '📸 RIGHT VIEW'},
                    {field: 'collateralPhotoSerial', label: '🔍 SERIAL / PLATE'},
                    {field: 'collateralPhotoDocument', label: '📄 TITLE / ORCR'}
                  ].map(item => (
                    <div key={item.field} className="bg-[#1c1c21] border border-[#2a2a35] rounded-lg p-3 text-center flex flex-col justify-center items-center">
                      <label className="block text-gray-400 text-[10px] mb-2 font-bold uppercase tracking-widest w-full cursor-pointer">
                        {item.label}
                        <input name={item.field} type="file" accept="image/*" className="w-full text-[10px] text-gray-500 mt-2" onChange={e => handleImage(e, item.field)} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-red-400 font-bold text-lg mb-3 uppercase tracking-wider">5. Legal Compliance & Consent</h2>
            <div className={`${borderStyle} p-4 space-y-4`}>
              
              <div className="bg-zinc-900 border border-zinc-700 rounded-md p-4 text-sm text-zinc-300 shadow-inner">
                <h3 className="font-bold text-white text-base mb-3 border-b border-zinc-700 pb-2">MGA TUNTUNIN AT KUNDISYON (Terms and Conditions)</h3>
                <ol className="list-decimal pl-5 space-y-2 break-words">
                  <li className="break-words">
                    <strong>INTERES AT GOOD PAYER DISCOUNT:</strong> Ang opisyal na flat-rate interest ng utang na ito ay <strong className="text-amber-400">{manualOfficialRate}%</strong>. PERO, kung ang NANGUTANG ay magbabayad ng tama sa oras sa lahat ng kanyang iskedul, siya ay bibigyan ng <strong className="text-emerald-400">{Math.round(manualOfficialRate - manualDiscountedRate)}% Good Payer Discount</strong> (kaya magiging {manualDiscountedRate}% na lamang ang epektibong interes). 
                    <br/>
                    <span className="text-zinc-400 text-[11px] italic mt-1 block">
                      (Simpleng paliwanag: Kung palagi kang on-time, {manualDiscountedRate}% lang ang tubo ng utang mo. Pero kapag na-late ka kahit isang araw sa iyong hulog, ma-vo-void ang discount at sisingilin ka ng buong {manualOfficialRate}% interes para sa buong kontrata.)
                    </span>
                  </li>
                  <li className="break-words">
                    <strong>LOAN EXTENSION (ROLLOVER):</strong> Kung sakaling matapos ang kontrata at hindi pa kayang bayaran ng buo ang utang, ang NANGUTANG ay maaaring humingi ng palugit (Rollover). Upang ma-extend ang utang, kailangang magbayad ng <strong className="text-amber-400">Extension Fee</strong> na katumbas ng {manualDiscountedRate}% ng orihinal na Principal.
                  </li>
                  <li className="break-words">Ang nag PAUTANG ay may karapatang mangolekta o maningil ng utang sa pamamagitan ng mga lehitimong paraan tulad ng pagbisita sa bahay, pagtawag, o pagsulat ng liham.</li>
                  <li className="break-words">Ang mga impormasyong ibinigay ng NANGUTANG ay totoo at tama. Ang anumang maling impormasyon ay maaaring maging dahilan ng agarang pagbabayad ng buong halaga.</li>
                  <li className="break-words">Ang kasunduang ito ay sumasailalim sa batas ng Republika ng Pilipinas.</li>
                  <li className="break-words">Sa kaso ng hindi pagbabayad, ang NANGUTANG ay sumasang-ayon na maaaring isama ang kanyang pangalan sa lista ng mga delinquent borrowers.</li>
                  <li className="break-words">Ang pagpirma sa kasunduang ito ay patunay na ang NANGUTANG ay nagkasundo at sumasang-ayon sa lahat ng tuntunin at kundisyon.</li>
                </ol>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-widest mt-4">Digital Signature (Sign Below)</label>
                <SignaturePad onSignature={(dataUrl) => setFormData(prev => ({...prev, digitalSignature: dataUrl}))} />
              </div>
              <div className="flex items-start gap-3 text-xs text-zinc-500">
                <input type="checkbox" required className="w-5 h-5 accent-emerald-500 mt-0.5" />
                <span className="break-words leading-relaxed text-zinc-300">
                  <strong className="text-white">I agree to the Data Privacy & Consent Waiver.</strong> I certify that all information is true, and I agree to the terms, interest rates, and penalties of this loan agreement.
                </span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={status !== ""} className="w-full bg-[#00df82] border border-[#00df82]/40 text-[#09090b] py-5 font-black text-xs tracking-widest uppercase hover:bg-[#00df82]/80 disabled:opacity-50 rounded-xl transition-colors shadow-[0_0_20px_rgba(0,223,130,0.15)]">
            {status || "SUBMIT APPLICATION"}
          </button>
        </form>
      </div>
    </div>
  );
}
