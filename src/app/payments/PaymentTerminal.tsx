"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { processSplitPaymentAction, getLoanDetailsAction } from "./actions";
import CollectionLog from "@/components/CollectionLog";

const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return "₱0.00";
  return "₱" + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (date: Date | string): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// 🚀 ADDED: fbProfileUrl included in the interface
interface Loan {
  id: number;
  client: { firstName: string; lastName: string; phone?: string; fbProfileUrl?: string | null };
  principal: number;
  interestRate: number;
  termDuration: number;
  totalRepayment: number;
  monthlyPayment: number;
  remainingBalance: number;
  totalPaid: number;
  startDate: Date;
  endDate: Date;
  termType: string;
}

interface ScheduleItem {
  id: number; period: number; dueDate: Date; payment: number; principal: number; interest: number;
  principalPaid: number; interestPaid: number; balance: number; status: string;
  paymentDate?: Date; amountPaid?: number; penaltyFee?: number;
}

interface LoanOption {
  id: number; clientId: number; client: { firstName: string; lastName: string };
}

const generateReceipt = async (
  paymentResult: any,
  loanData: Loan,
  paymentType: "INTEREST" | "PRINCIPAL" | "FULL",
  installment: { period: number; totalPeriods: number }
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 180, 100);
  doc.text("FINTECH VAULT", 105, 20, { align: "center" });
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("OFFICIAL RECEIPT", 105, 30, { align: "center" });

  doc.setDrawColor(0, 180, 100);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const receiptY = 45;
  doc.setFont("helvetica", "bold");
  doc.text(`Receipt No:`, 20, receiptY);
  doc.setFont("helvetica", "normal");
  doc.text(`RCP-${paymentResult.payment.id.toString().padStart(6, '0')}`, 50, receiptY);

  doc.setFont("helvetica", "bold");
  doc.text(`Date:`, 120, receiptY);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(paymentResult.payment.paymentDate).toLocaleDateString('en-PH', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  }), 135, receiptY);

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, receiptY + 10, 170, 25, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("CLIENT INFORMATION", 25, receiptY + 18);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${paymentResult.loan.clientName}`, 25, receiptY + 26);
  doc.text(`Loan ID: TXN-${paymentResult.loan.id.toString().padStart(4, '0')}`, 25, receiptY + 32);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 100, 200);
  doc.text(`Installment ${installment.period} of ${installment.totalPeriods}`, 130, receiptY + 26);

  const typeColor = paymentType === "INTEREST" ? [255, 165, 0] : paymentType === "PRINCIPAL" ? [0, 150, 255] : [0, 200, 100];
  doc.setFillColor(typeColor[0], typeColor[1], typeColor[2]);
  doc.roundedRect(130, receiptY + 30, 55, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(paymentType, 157.5, receiptY + 35.5, { align: "center" });

  autoTable(doc, {
    startY: receiptY + 45,
    head: [["Description", "Amount"]],
    body: [
      ["Payment Type", paymentType === "INTEREST" ? "Interest Only" : paymentType === "PRINCIPAL" ? "Principal Only" : "Full Payment"],
      ["Amount Paid", formatCurrency(paymentResult.payment.amount)],
      [paymentType === "INTEREST" ? "Interest Portion" : "Principal Portion", formatCurrency(paymentResult.payment.amount)],
      ["Total Paid to Date", formatCurrency(paymentResult.totalPaidToDate)],
      ["Remaining Balance", formatCurrency(paymentResult.payment.remainingBalance)]
    ],
    theme: "striped",
    headStyles: { fillColor: [0, 180, 100], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 70, halign: "right" } }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || receiptY + 100;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your payment. This is a system-generated receipt.", 105, finalY + 20, { align: "center" });
  doc.text("FinTech Vault - Your Trusted Lending Partner", 105, finalY + 26, { align: "center" });

  doc.save(`Receipt-${paymentResult.payment.id.toString().padStart(6, '0')}.pdf`);
};

const InstallmentCard = ({ item, totalPeriods, loanData, onPaymentSuccess }: { item: ScheduleItem; totalPeriods: number; loanData: Loan; onPaymentSuccess: () => void; }) => {
  const [loading, setLoading] = useState<"interest" | "principal" | null>(null);
  
  const interestRemaining = item.interest - item.interestPaid;
  const principalRemaining = item.principal - item.principalPaid;
  const interestPaid = item.interestPaid >= item.interest;
  const principalPaid = item.principalPaid >= item.principal;
  const isFullyPaid = item.status === "PAID";
  const isLate = item.status === "LATE" || item.status === "MISSED";
  const isPartial = item.status === "PARTIAL";

  const handlePayment = async (type: "INTEREST" | "PRINCIPAL") => {
    setLoading(type.toLowerCase() as "interest" | "principal");
    
    try {
      const result = await processSplitPaymentAction(item.id, type);
      
      if (result.success && result.payment && result.loan) {
        await generateReceipt(result, loanData, type, { period: item.period, totalPeriods });
        
        // 🚀 AUTO-OPEN FACEBOOK/MESSENGER FOR RECEIPT DELIVERY
        if (loanData.client.fbProfileUrl) {
          window.open(loanData.client.fbProfileUrl, '_blank', 'noopener,noreferrer');
        }

        onPaymentSuccess();
      } else {
        alert(result.error || "Payment failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    
    setLoading(null);
  };

  const getStatusStyles = () => {
    if (isFullyPaid) return { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "PAID" };
    if (isLate) return { bg: "bg-red-500/20", text: "text-red-400", label: "LATE" };
    if (isPartial) return { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "PARTIAL" };
    return { bg: "bg-blue-500/20", text: "text-blue-400", label: "PENDING" };
  };

  const statusStyle = getStatusStyles();

  return (
    <div className={`bg-zinc-800 border ${isFullyPaid ? 'border-emerald-500/30' : isLate ? 'border-red-500/30' : 'border-zinc-700'} rounded-2xl p-5 transition-all hover:border-zinc-600`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-white">Installment {item.period}</span>
            <span className="text-zinc-500 text-sm">of {totalPeriods}</span>
          </div>
          <p className="text-zinc-400 text-sm">Due: {formatDate(item.dueDate)}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-900 rounded-xl p-3">
          <p className="text-xs text-yellow-400 uppercase mb-1">Interest</p>
          <p className="text-lg font-bold text-white">{formatCurrency(item.interest)}</p>
          {item.interestPaid > 0 && <p className="text-xs text-emerald-400 mt-1">Paid: {formatCurrency(item.interestPaid)}</p>}
        </div>
        <div className="bg-zinc-900 rounded-xl p-3">
          <p className="text-xs text-blue-400 uppercase mb-1">Principal</p>
          <p className="text-lg font-bold text-white">{formatCurrency(item.principal)}</p>
          {item.principalPaid > 0 && <p className="text-xs text-emerald-400 mt-1">Paid: {formatCurrency(item.principalPaid)}</p>}
        </div>
      </div>

      {item.penaltyFee && item.penaltyFee > 0 && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
          <p className="text-xs text-rose-400 uppercase mb-1">Penalty Fees</p>
          <p className="text-lg font-bold text-rose-400">{formatCurrency(item.penaltyFee)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handlePayment("INTEREST")}
          disabled={interestPaid || isFullyPaid || loading !== null}
          className={`py-4 px-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1
            ${interestPaid || isFullyPaid ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95'}
            ${loading === 'interest' ? 'animate-pulse' : ''}`}
        >
          {loading === 'interest' ? <span>Processing...</span> : interestPaid || isFullyPaid ? <><span className="text-lg">✓</span><span>Paid</span></> : <><span>Pay Interest</span><span className="text-base font-bold">{formatCurrency(interestRemaining)}</span></>}
        </button>

        <button
          onClick={() => handlePayment("PRINCIPAL")}
          disabled={principalPaid || isFullyPaid || loading !== null}
          className={`py-4 px-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1
            ${principalPaid || isFullyPaid ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-blue-500/20 border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white active:scale-95'}
            ${loading === 'principal' ? 'animate-pulse' : ''}`}
        >
          {loading === 'principal' ? <span>Processing...</span> : principalPaid || isFullyPaid ? <><span className="text-lg">✓</span><span>Paid</span></> : <><span>Pay Principal</span><span className="text-base font-bold">{formatCurrency(principalRemaining)}</span></>}
        </button>
      </div>

      <CollectionLog installmentId={item.id} penaltyFee={item.penaltyFee || 0} status={item.status} expectedAmount={item.payment} onPenaltyApplied={onPaymentSuccess} />
    </div>
  );
};

export default function PaymentTerminal({ loans: initialLoans, portfolio }: { loans: LoanOption[]; portfolio: string }) {
  return (
    <Suspense fallback={<PaymentTerminalLoading />}>
      <PaymentTerminalContent loans={initialLoans} portfolio={portfolio} />
    </Suspense>
  );
}

function PaymentTerminalLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center pt-4">
        <div><h1 className="text-2xl font-bold text-white">Payment Terminal</h1><p className="text-sm text-zinc-500">Loading...</p></div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl animate-pulse">
        <div className="h-8 bg-zinc-800 rounded-lg w-1/3 mb-4"></div><div className="h-12 bg-zinc-800 rounded-xl"></div>
      </div>
    </div>
  );
}

function PaymentTerminalContent({ loans: initialLoans, portfolio }: { loans: LoanOption[]; portfolio: string }) {
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get('clientId');
  
  const getInitialLoanId = (): string => {
    if (urlClientId) {
      const matchingLoan = initialLoans.find(loan => loan.clientId === Number(urlClientId));
      if (matchingLoan) return String(matchingLoan.id);
    }
    return "";
  };
  
  const [selectedLoanId, setSelectedLoanId] = useState<string>(getInitialLoanId);
  const [loanDetails, setLoanDetails] = useState<{ loan: Loan; schedule: ScheduleItem[] } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleLoanChange = (newLoanId: string) => {
    setSelectedLoanId(newLoanId);
    if (!newLoanId) setLoanDetails(null);
  };

  useEffect(() => {
    let isMounted = true;
    if (!selectedLoanId) return;

    const fetchDetails = async () => {
      setDetailsLoading(true);
      try {
        const result = await getLoanDetailsAction(Number(selectedLoanId));
        if (result && !result.error && isMounted) setLoanDetails(result as { loan: Loan; schedule: ScheduleItem[] });
      } catch (err) { console.error("Failed to fetch loan details:", err); }
      if (isMounted) setDetailsLoading(false);
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [selectedLoanId]);

  const refreshDetails = async () => {
    if (!selectedLoanId) return;
    const result = await getLoanDetailsAction(Number(selectedLoanId));
    if (result && !result.error) setLoanDetails(result as { loan: Loan; schedule: ScheduleItem[] });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Terminal</h1>
          <p className="text-sm text-zinc-500">Portfolio: <span className="text-yellow-400">{portfolio}</span></p>
        </div>
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Select Client</h2>
        <select value={selectedLoanId} onChange={(e) => handleLoanChange(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-blue-500 text-lg">
          <option value="">-- Choose a Client --</option>
          {initialLoans.map(loan => (
            <option key={loan.id} value={loan.id}>{loan.client.firstName} {loan.client.lastName} (TXN-{loan.id.toString().padStart(4, '0')})</option>
          ))}
        </select>
      </div>

      {selectedLoanId && loanDetails && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Loan Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-500 uppercase mb-1">Principal</p><p className="text-lg font-bold text-white">{formatCurrency(loanDetails.loan.principal)}</p></div>
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-500 uppercase mb-1">Total Repayment</p><p className="text-lg font-bold text-white">{formatCurrency(loanDetails.loan.totalRepayment)}</p></div>
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-500 uppercase mb-1">Total Paid</p><p className="text-lg font-bold text-emerald-400">{formatCurrency(loanDetails.loan.totalPaid)}</p></div>
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-500 uppercase mb-1">Remaining</p><p className="text-lg font-bold text-red-400">{formatCurrency(loanDetails.loan.remainingBalance)}</p></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-2"><span>Payment Progress</span><span>{Math.round((loanDetails.loan.totalPaid / loanDetails.loan.totalRepayment) * 100)}%</span></div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(loanDetails.loan.totalPaid / loanDetails.loan.totalRepayment) * 100}%` }} /></div>
          </div>
        </div>
      )}

      {selectedLoanId && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Installments - Tap to Pay</h2>
          {detailsLoading ? <p className="text-zinc-500 text-center py-8">Loading installments...</p> : loanDetails ? (
            <div className="space-y-4">
              {loanDetails.schedule.map((item) => (
                <InstallmentCard key={item.id} item={item} totalPeriods={loanDetails.loan.termDuration} loanData={loanDetails.loan} onPaymentSuccess={refreshDetails} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
