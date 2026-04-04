import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ContractPrintButton } from "./ContractPrintButton";

// Format currency for contract - forces 2 decimal places
const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return "₱" + num.toFixed(2);
};

// Format date for contract
const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Format date for due schedule
const formatShortDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Error boundary for contract page
function ContractErrorBoundary({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-zinc-900 p-8 flex items-center justify-center">
      <div className="bg-zinc-800 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
        <p className="text-red-400 text-lg font-bold mb-2">Error Loading Contract</p>
        <p className="text-zinc-400 text-sm mb-4">{error}</p>
        <a href="/" className="text-blue-400 hover:underline">← Return to Dashboard</a>
      </div>
    </div>
  );
}

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string; loanId: string }>;
}) {
  try {
    const { id, loanId } = await params;
    const clientId = parseInt(id);
    const loanIdNum = parseInt(loanId);

    if (isNaN(clientId) || isNaN(loanIdNum)) {
      notFound();
    }

    // Fetch client with signature
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        application: true,
      }
    });

    if (!client) {
      notFound();
    }

    // Fetch loan with installments
    const loan = await prisma.loan.findUnique({
      where: { id: loanIdNum },
      include: {
        installments: {
          orderBy: { period: 'asc' }
        },
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            portfolio: true
          }
        }
      }
    });

    if (!loan || loan.clientId !== clientId) {
      notFound();
    }

    // Get digital signature - prefer client's signature, fallback to application's
    // Strict null check to prevent rendering issues
    const digitalSignature: string | null = 
      (client.digitalSignature && client.digitalSignature.length > 0) 
        ? client.digitalSignature 
        : (client.application?.digitalSignature && client.application.digitalSignature.length > 0) 
          ? client.application.digitalSignature 
          : null;

  // Calculate totals
  const totalPrincipal = Number(loan.principal);
  const totalInterest = Number(loan.totalInterest);
  const totalRepayment = Number(loan.totalRepayment);
  const interestRate = Number(loan.interestRate);
  const termDuration = loan.termDuration;
  const termType = loan.termType;

  // Get today's date for contract
  const contractDate = formatDate(new Date());

  return (
    <>
      {/* Print Button - Client Component */}
      <ContractPrintButton clientId={clientId} />

      {/* Contract Content */}
      <div className="min-h-screen bg-white text-black p-8 print:p-2 print:bg-white print:text-black print:text-sm">
        <div className="max-w-4xl mx-auto bg-white border-2 border-black p-8 print:p-4 print:border-1 print:border-black">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6 print:mb-4 print:pb-2">
            <h1 className="text-2xl font-black uppercase tracking-wider">KASUNDUAN SA PAG-UTANG</h1>
            <p className="text-sm text-zinc-600 mt-1">Loan Agreement Contract</p>
            <p className="text-xs text-zinc-500 mt-2">Contract Date: {contractDate}</p>
          </div>

          {/* Parties */}
          <div className="mb-6 print:mb-4 space-y-4 print:space-y-2">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">PAUTANG (Lender):</p>
                <p className="font-bold">FinTech Vault</p>
                <p className="text-sm text-zinc-600">Registered Lending Institution</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">NANGUTANG (Borrower):</p>
                <p className="font-bold">{client.firstName} {client.lastName}</p>
                {client.phone && <p className="text-sm text-zinc-600">Tel: {client.phone}</p>}
                {client.address && <p className="text-sm text-zinc-600">Address: {client.address}</p>}
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="border border-zinc-300 rounded-lg p-4 mb-6 print:mb-4 bg-zinc-50 print:border-black print:bg-white print:break-inside-avoid">
            <h2 className="font-bold text-sm uppercase border-b border-zinc-300 pb-2 mb-3 print:border-black">MGA DETALYE NG UTANG (Loan Details)</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Transaction No.:</p>
                <p className="font-bold">TXN-{loan.id.toString().padStart(4, '0')}</p>
              </div>
              <div>
                <p className="text-zinc-500">Contract Reference:</p>
                <p className="font-bold">KSD-{loan.id.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-zinc-500">Principal Amount:</p>
                <p className="font-bold text-lg">₱{totalPrincipal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Term Duration:</p>
                <p className="font-bold">{termDuration} {termType}</p>
              </div>
              <div>
                <p className="text-zinc-500">Start Date:</p>
                <p className="font-bold">{formatDate(loan.startDate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Maturity Date:</p>
                <p className="font-bold">{formatDate(loan.endDate)}</p>
              </div>
              {loan.agent && (
                <div>
                  <p className="text-zinc-500">Assigned Agent:</p>
                  <p className="font-bold">{loan.agent.name}</p>
                </div>
              )}
            </div>
            
            {/* REBATE TRAP INTEREST BREAKDOWN */}
            <div className="mt-4 pt-4 border-t border-zinc-300 print:border-black">
              <h3 className="font-bold text-xs uppercase text-zinc-600 mb-3">Interest Rate Structure (Rebate Trap)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white border border-zinc-200 rounded p-2 print:border-black">
                  <p className="text-xs text-zinc-500">Official Interest Rate:</p>
                  <p className="font-bold">10%</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded p-2 print:border-black">
                  <p className="text-xs text-zinc-500">Official Interest Amount:</p>
                  <p className="line-through text-red-700">₱{(totalPrincipal * 0.10).toFixed(2)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2 print:bg-white print:border-black">
                  <p className="text-xs text-zinc-500">Good Payer Discount:</p>
                  <p className="font-bold text-emerald-700">-4%</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2 print:bg-white print:border-black">
                  <p className="text-xs text-zinc-500">Discount Amount:</p>
                  <p className="font-bold text-emerald-700">-₱{(totalPrincipal * 0.04).toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 print:bg-white print:border-black">
                  <p className="text-xs text-zinc-500">Net Interest (If Paid On Time):</p>
                  <p className="font-bold text-blue-700">₱{(totalPrincipal * 0.06).toFixed(2)}</p>
                </div>
                <div className="bg-zinc-100 border border-zinc-300 rounded p-2 print:bg-white print:border-black">
                  <p className="text-xs text-zinc-500">Total Repayment:</p>
                  <p className="font-bold text-lg text-emerald-700">₱{(totalPrincipal * 1.06).toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 italic">
                * The 4% Good Payer Discount is revoked if payments are late. Full 10% interest applies on default.
              </p>
            </div>
          </div>

          {/* Collateral (Palit-Sigurado) Section */}
          <div className="print:break-inside-avoid mb-6 print:mb-4">
            <div className="border border-zinc-300 rounded-lg p-4 bg-zinc-50 print:border-black print:bg-white">
              <h3 className="font-bold text-sm uppercase border-b border-zinc-300 pb-2 mb-3 print:border-black">KOLATERAL (PALIT-SIGURADO)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-zinc-500">Bagay (Item):</p>
                  <p className="font-bold">{loan.collateralName || 'Wala (None)'}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Deskripsyon:</p>
                  <p className="font-bold">{loan.collateralDescription || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-zinc-500">Kundisyon/Depekto (Condition/Defects):</p>
                  <p className="font-bold">{loan.collateralDefects || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="print:break-inside-avoid mb-6 print:mb-4">
            <div className="border border-zinc-300 rounded-lg p-4 print:border-black print:bg-white">
              <h2 className="font-bold text-sm uppercase border-b border-zinc-300 pb-2 mb-3 print:border-black print:pb-1 print:mb-2">ISKEDUL NG PAGBAYAD (Payment Schedule)</h2>
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-300 print:border-black">
                  <th className="text-left py-2 px-2">Period</th>
                  <th className="text-left py-2 px-2">Due Date</th>
                  <th className="text-right py-2 px-2">Principal</th>
                  <th className="text-right py-2 px-2">Interest</th>
                  <th className="text-right py-2 px-2">Total Due</th>
                </tr>
              </thead>
              <tbody>
                {loan.installments.map((inst) => (
                  <tr key={inst.id} className="border-b border-zinc-200 print:border-black">
                    <td className="py-2 px-2">{inst.period}</td>
                    <td className="py-2 px-2">{formatShortDate(inst.dueDate)}</td>
                    <td className="text-right py-2 px-2">₱{Number(inst.principal).toFixed(2)}</td>
                    <td className="text-right py-2 px-2">₱{Number(inst.interest).toFixed(2)}</td>
                    <td className="text-right py-2 px-2 font-bold">₱{Number(inst.expectedAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-400 font-bold print:border-black">
                  <td colSpan={2} className="py-2 px-2">TOTAL</td>
                  <td className="text-right py-2 px-2">₱{totalPrincipal.toFixed(2)}</td>
                  <td className="text-right py-2 px-2">₱{totalInterest.toFixed(2)}</td>
                  <td className="text-right py-2 px-2">₱{totalRepayment.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="print:break-inside-avoid mb-6 print:mb-4">
            <h2 className="font-bold text-sm uppercase border-b border-zinc-300 pb-2 mb-3 print:pb-1 print:mb-2">MGA TUNTUNIN AT KUNDISYON (Terms and Conditions)</h2>
            <ol className="list-decimal list-inside text-sm space-y-2 text-zinc-700">
              <li>Ang NANGUTANG ay sumasang-ayon na bayaran ang kabuuang halaga ng utang kasama ang interes sa petsang nakasaad sa iskedul ng pagbabayad.</li>
              <li><strong>REBATE TRAP CLAUSE:</strong> Ang Good Payer Discount (4%) ay KONDISYONAL lamang. Kung hindi nabayaran sa tamang petsa, ang discount ay REVOKED at ang full 10% interest ay mag-apply. Bukod pa rito, ang <strong>6% Rollover Extension Fee</strong> ay maidadagdag sa outstanding balance para sa mga late payments.</li>
              <li>Ang PAUTANG ay may karapatang mangolekta ng utang sa pamamagitan ng mga lehitimong paraan tulad ng pagbisita sa bahay, pagtawag, o pagsulat ng liham.</li>
              <li>Ang mga impormasyong ibinigay ng NANGUTANG ay totoo at tama. Ang anumang maling impormasyon ay maaaring maging dahilan ng agarang pagbabayad ng buong halaga.</li>
              <li>Ang kasunduang ito ay sumasailalim sa batas ng Republika ng Pilipinas.</li>
              <li>Sa kaso ng hindi pagbabayad, ang NANGUTANG ay sumasang-ayon na maaaring isama ang kanyang pangalan sa lista ng mga delinquent borrowers.</li>
              <li>Ang pagpirma sa kasunduang ito ay patunay na ang NANGUTANG ay nagkasundo at sumasang-ayon sa lahat ng tuntunin at kundisyon.</li>
            </ol>
          </div>

          {/* Signature Section */}
          <div className="print:break-inside-avoid mt-12 print:mt-8 pt-8 print:pt-4 border-t-2 border-black">
            <div className="grid grid-cols-2 gap-12">
              {/* Lender Signature */}
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-4">PAUTANG (Lender):</p>
                <div className="border-b-2 border-black h-20 mb-2 flex items-end justify-center">
                  <p className="text-center font-bold text-zinc-400 pb-2">FinTech Vault</p>
                </div>
                <p className="text-center text-sm">Authorized Representative</p>
                <p className="text-center text-xs text-zinc-500 mt-1">Date: _______________</p>
              </div>

              {/* Borrower Signature with Digital Signature Injection */}
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-4">NANGUTANG (Borrower):</p>
                <div className="border-b-2 border-black h-20 mb-2 flex items-center justify-center">
                  {digitalSignature ? (
                    <img
                      src={digitalSignature}
                      alt="E-Signature"
                      className="max-h-16 max-w-full object-contain"
                      style={{ maxHeight: '70px' }}
                    />
                  ) : (
                    <div className="h-full flex items-end justify-center w-full">
                      <p className="text-zinc-300 text-xs pb-2">(Sign above the line)</p>
                    </div>
                  )}
                </div>
                <p className="text-center font-bold">{client.firstName} {client.lastName}</p>
                <p className="text-center text-xs text-zinc-500 mt-1">Date: _______________</p>
              </div>
            </div>

            {/* Witness / Co-Maker Section */}
            {loan.agent && (
              <div className="mt-12">
                <p className="text-xs text-zinc-500 uppercase font-bold mb-4">WITNESS / CO-MAKER (Optional):</p>
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <div className="border-b border-zinc-400 h-16 mb-2"></div>
                    <p className="text-center text-sm">{loan.agent.name}</p>
                    <p className="text-center text-xs text-zinc-500">Field Agent / Co-Maker</p>
                  </div>
                  <div>
                    <div className="border-b border-zinc-400 h-16 mb-2"></div>
                    <p className="text-center text-sm">Witness Name</p>
                    <p className="text-center text-xs text-zinc-500">Witness</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 print:mt-4 pt-4 print:pt-2 border-t border-zinc-300 text-center">
            <p className="text-xs text-zinc-500">
              This document is generated electronically and is valid without physical signature if digital signature is present.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Generated on {contractDate} • Reference: KSD-{loan.id.toString().padStart(6, '0')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
  } catch (error) {
    console.error('Contract page error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return <ContractErrorBoundary error={errorMessage} />;
  }
}
