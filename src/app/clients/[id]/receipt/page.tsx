import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper functions with null safety
const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return "₱0.00";
  return "₱" + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default async function ReceiptPage({ params }: PageProps) {
  const { id } = await params;
  const clientId = parseInt(id, 10);

  // FAILSAFE: Invalid ID check
  if (isNaN(clientId)) {
    return (
      <div className="p-10 text-black bg-white min-h-screen">
        <h2 className="text-xl font-bold text-red-600">Invalid Client ID</h2>
        <p>The provided ID is not a valid number.</p>
      </div>
    );
  }

  // Fetch client data first
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      loans: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              phone: true,
              portfolio: true
            }
          }
        }
      }
    }
  });

  // FAILSAFE: Client not found
  if (!client) {
    return (
      <div className="p-10 text-black bg-white min-h-screen">
        <h2 className="text-xl font-bold text-red-600">Client Not Found</h2>
        <p>No client record exists with ID: {clientId}</p>
      </div>
    );
  }

  // Fetch application data if client has an applicationId
  let application = null;
  let agentFromApplication = null;
  
  if (client.applicationId) {
    application = await prisma.application.findUnique({
      where: { id: client.applicationId }
    });
    
    // Fetch agent separately if agentId exists on application
    if (application?.agentId) {
      agentFromApplication = await prisma.agent.findUnique({
        where: { id: application.agentId }
      });
    }
  }

  // If no application via relation, try to find by matching client data
  if (!application) {
    application = await prisma.application.findFirst({
      where: {
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone || ""
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (application?.agentId) {
      agentFromApplication = await prisma.agent.findUnique({
        where: { id: application.agentId }
      });
    }
  }

  // Get latest loan for fallback data
  const latestLoan = client.loans?.[0] || null;
  
  // FAILSAFE: No data at all
  if (!application && !latestLoan) {
    return (
      <div className="p-10 text-black bg-white min-h-screen">
        <h2 className="text-xl font-bold text-amber-600">Receipt Not Available</h2>
        <p>No application or loan records found for this client.</p>
        <p className="text-sm text-gray-500 mt-2">Client: {client.firstName} {client.lastName}</p>
      </div>
    );
  }

  // Extract data with extensive fallbacks and optional chaining
  const firstName = application?.firstName || client?.firstName || "—";
  const lastName = application?.lastName || client?.lastName || "—";
  const phone = application?.phone || client?.phone || "—";
  const address = application?.address || client?.address || "—";
  const birthDate = application?.birthDate || null;
  const age = application?.age || null;
  const employment = application?.employment || "—";
  const income = application?.income ? Number(application.income) : null;
  const existingLoansDetails = application?.existingLoansDetails || "None declared";
  const monthlyDebtPayment = application?.monthlyDebtPayment ? Number(application.monthlyDebtPayment) : null;
  const familySize = application?.familySize?.toString() || "—";
  const workingMembers = application?.workingMembers?.toString() || "—";
  const students = application?.students?.toString() || "—";
  const infants = application?.infants?.toString() || "—";
  const housingStatus = application?.housingStatus || "—";
  const monthlyBills = application?.monthlyBills ? Number(application.monthlyBills) : null;
  const referenceName = application?.referenceName || "—";
  const referencePhone = application?.referencePhone || "—";
  const collateralName = application?.collateralName || latestLoan?.collateralName || null;
  const collateralDescription = application?.collateralDescription || latestLoan?.collateralDescription || null;
  const collateralDefects = application?.collateralDefects || latestLoan?.collateralDefects || null;
  const digitalSignature = client?.digitalSignature || application?.digitalSignature || null;
  
  // Loan configuration with fallbacks
  const principal = application?.principal 
    ? Number(application.principal) 
    : latestLoan?.principal 
      ? Number(latestLoan.principal) 
      : 0;
  const termType = application?.termType || latestLoan?.termType || "Months";
  const termDuration = application?.termDuration || latestLoan?.termDuration || 1;
  const interestRate = application?.interestRate 
    ? Number(application.interestRate) 
    : latestLoan?.interestRate 
      ? Number(latestLoan.interestRate) 
      : 6;
  const totalInterest = application?.totalInterest 
    ? Number(application.totalInterest) 
    : (principal * interestRate / 100);
  const totalRepayment = application?.totalRepayment 
    ? Number(application.totalRepayment) 
    : (principal + totalInterest);
  const perPeriodAmount = termDuration > 0 ? totalRepayment / termDuration : totalRepayment;
  
  // Agent info with fallbacks
  const agentName = agentFromApplication?.name || latestLoan?.agent?.name || "No Agent Assigned";

  // Application date
  const applicationDate = application?.createdAt || client?.createdAt || new Date();
  const portfolio = client?.portfolio || application?.portfolio || "Main Portfolio";

  // Generate amortization schedule
  const generateSchedule = () => {
    if (!principal || principal <= 0 || !termDuration || termDuration <= 0) return [];
    
    const schedule = [];
    const principalPerPeriod = principal / termDuration;
    const interestPerPeriod = totalInterest / termDuration;
    const totalPerPeriod = totalRepayment / termDuration;
    
    for (let i = 1; i <= termDuration; i++) {
      const date = new Date();
      if (termType === 'Days') {
        date.setDate(date.getDate() + i);
      } else if (termType === 'Weeks') {
        date.setDate(date.getDate() + (i * 7));
      } else if (termType === 'Months') {
        date.setMonth(date.getMonth() + i);
      }
      
      schedule.push({
        period: i,
        dateStr: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        principal: principalPerPeriod,
        interest: interestPerPeriod,
        total: totalPerPeriod
      });
    }
    return schedule;
  };

  const amortizationSchedule = generateSchedule();

  // Get term display label
  const getTermLabel = (type: string | null | undefined): string => {
    if (!type) return "Monthly";
    if (type === 'Days') return 'Daily';
    if (type === 'Weeks') return 'Weekly';
    return 'Monthly';
  };

  // Get term singular/plural
  const getTermUnit = (type: string | null | undefined, duration: number): string => {
    if (!type) return duration > 1 ? "Months" : "Month";
    const singular = type.slice(0, -1); // Remove 's' from Days/Weeks/Months
    return duration > 1 ? type : singular;
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Print Trigger Button */}
      <PrintTrigger />

      {/* Receipt Content */}
      <div className="max-w-2xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-black pb-6">
          <h1 className="text-2xl font-bold text-black mb-1">LOAN APPLICATION RECEIPT</h1>
          <p className="text-sm text-gray-600">Official Document • {formatDateTime(applicationDate)}</p>
          <p className="text-xs text-gray-500 mt-1">Portfolio: {portfolio}</p>
          <p className="text-xs text-gray-400 mt-1">Client ID: {clientId}</p>
        </div>

        {/* LOAN CONFIGURATION */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">💰 LOAN CONFIGURATION</h2>
          
          <div className="border border-black p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Principal Amount:</span>
              <span className="font-bold">{formatCurrency(principal)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Assigned Agent:</span>
              <span className="font-bold">{agentName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Payment Schedule:</span>
              <span className="font-bold">{getTermLabel(termType)} Payments</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Duration:</span>
              <span className="font-bold">{termDuration} {getTermUnit(termType, termDuration)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Total Interest ({interestRate}%):</span>
              <span className="font-bold">{formatCurrency(totalInterest)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Total Repayment:</span>
              <span className="font-bold">{formatCurrency(totalRepayment)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <span className="text-gray-700 text-sm font-bold">Per Period:</span>
              <span className="font-bold text-lg">{formatCurrency(perPeriodAmount)}</span>
            </div>
          </div>
        </div>

        {/* AMORTIZATION SCHEDULE */}
        {amortizationSchedule.length > 0 && (
          <div className="mb-6 break-inside-avoid">
            <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">📅 PAYMENT SCHEDULE</h2>
            <p className="text-xs text-gray-500 mb-3 italic">Payment dates will be adjusted upon approval.</p>
            <div className="border border-black">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-black">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2 text-right">Principal</th>
                    <th className="p-2 text-right">Interest</th>
                    <th className="p-2 text-right">Total Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {amortizationSchedule.map((row) => (
                    <tr key={row.period}>
                      <td className="p-2 whitespace-nowrap">{row.dateStr}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(row.principal)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(row.interest)}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BORROWER INFORMATION */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">BORROWER INFORMATION</h2>
          
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <div className="font-semibold">Full Name:</div>
            <div>{firstName} {lastName}</div>
            
            <div className="font-semibold">Phone:</div>
            <div>{phone}</div>
            
            <div className="font-semibold">Address:</div>
            <div>{address}</div>
            
            {birthDate && (
              <>
                <div className="font-semibold">Birth Date:</div>
                <div>{formatDate(birthDate)}</div>
              </>
            )}
            
            {age && (
              <>
                <div className="font-semibold">Age:</div>
                <div>{age} years old</div>
              </>
            )}
          </div>
        </div>

        {/* FINANCIAL INFORMATION */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">FINANCIAL INFORMATION</h2>
          
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <div className="font-semibold">Employment/Business:</div>
            <div>{employment}</div>
            
            {income !== null && (
              <>
                <div className="font-semibold">Gross Income:</div>
                <div>{formatCurrency(income)}</div>
              </>
            )}
            
            <div className="font-semibold">Existing Loans:</div>
            <div className="break-words">{existingLoansDetails}</div>
            
            {monthlyDebtPayment !== null && (
              <>
                <div className="font-semibold">Monthly Debt Payment:</div>
                <div>{formatCurrency(monthlyDebtPayment)}</div>
              </>
            )}
            
            <div className="font-semibold">Family Size:</div>
            <div>{familySize}</div>
            
            <div className="font-semibold">Working Members:</div>
            <div>{workingMembers}</div>
            
            <div className="font-semibold">Housing Status:</div>
            <div>{housingStatus}</div>
            
            {monthlyBills !== null && (
              <>
                <div className="font-semibold">Monthly Bills:</div>
                <div>{formatCurrency(monthlyBills)}</div>
              </>
            )}
          </div>
        </div>

        {/* REFERENCE */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">REFERENCE</h2>
          
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <div className="font-semibold">Reference Name:</div>
            <div>{referenceName}</div>
            
            <div className="font-semibold">Reference Phone:</div>
            <div>{referencePhone}</div>
          </div>
        </div>

        {/* COLLATERAL SECTION */}
        {collateralName && (
          <div className="mb-6 break-inside-avoid">
            <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">COLLATERAL (PALIT-SIGURADO)</h2>
            
            <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
              <div className="font-semibold">Item Name:</div>
              <div className="break-words">{collateralName}</div>
              
              {collateralDescription && (
                <>
                  <div className="font-semibold">Description:</div>
                  <div className="break-words">{collateralDescription}</div>
                </>
              )}
              
              {collateralDefects && (
                <>
                  <div className="font-semibold">Known Defects:</div>
                  <div className="break-words">{collateralDefects}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* DATA PRIVACY & CONSENT WAIVER */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">DATA PRIVACY & CONSENT WAIVER</h2>
          
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p className="break-words">
              By signing below, I hereby authorize the lending institution to collect, process, and store my personal and financial information for the purpose of evaluating my loan application.
            </p>
            <p className="break-words">
              I understand that my data may be shared with third-party verification services and credit bureaus for authentication and risk assessment purposes.
            </p>
            <p className="break-words">
              I certify that all information provided in this application is true and accurate to the best of my knowledge. I acknowledge that any false statement may result in immediate rejection of my application and potential legal action.
            </p>
            <p className="break-words">
              I agree to the terms and conditions of the loan agreement, including but not limited to: interest rates, repayment schedules, and penalties for late or non-payment.
            </p>
          </div>
        </div>

        {/* MGA TUNTUNIN AT KUNDISYON */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">MGA TUNTUNIN AT KUNDISYON (Terms and Conditions)</h2>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li className="break-words">
              <strong>INTERES AT GOOD PAYER DISCOUNT:</strong> Ang opisyal na flat-rate interest ng utang na ito ay <strong>10%</strong>. PERO, kung ang NANGUTANG ay magbabayad ng tama sa oras sa lahat ng kanyang iskedul, siya ay bibigyan ng <strong>4% Good Payer Discount</strong> (kaya magiging 6% na lamang ang epektibong interes). 
              <br/>
              <span className="text-gray-500 text-[11px] italic">
                (Simpleng paliwanag: Kung palagi kang on-time, 6% lang ang tubo ng utang mo. Pero kapag na-late ka kahit isang araw sa iyong hulog, ma-vo-void ang discount at sisingilin ka ng buong 10% interes para sa buong kontrata.)
              </span>
            </li>
            <li className="break-words">
              <strong>LOAN EXTENSION (ROLLOVER):</strong> Kung sakaling matapos ang kontrata at hindi pa kayang bayaran ng buo ang utang, ang NANGUTANG ay maaaring humingi ng palugit (Rollover). Upang ma-extend ang utang, kailangang magbayad ng <strong>Extension Fee</strong> na katumbas ng 6% ng orihinal na Principal.
              <br/>
              <span className="text-gray-500 text-[11px] italic">
                (Simpleng paliwanag: Kung ₱20,000 ang utang mo at hindi mo mabayaran sa due date, kailangan mong magbayad ng ₱1,200 Extension Fee para mabigyan ka ng panibagong palugit. Ang ₱1,200 na ito ay fee lamang at HINDI ibabawas sa utang mong ₱20,000.)
              </span>
            </li>
            <li className="break-words">Ang nag PAUTANG ay may karapatang mangolekta o maningil ng utang sa pamamagitan ng mga lehitimong paraan tulad ng pagbisita sa bahay, pagtawag, o pagsulat ng liham.</li>
            <li className="break-words">Ang mga impormasyong ibinigay ng NANGUTANG ay totoo at tama. Ang anumang maling impormasyon ay maaaring maging dahilan ng agarang pagbabayad ng buong halaga.</li>
            <li className="break-words">Ang kasunduang ito ay sumasailalim sa batas ng Republika ng Pilipinas.</li>
            <li className="break-words">Sa kaso ng hindi pagbabayad, ang NANGUTANG ay sumasang-ayon na maaaring isama ang kanyang pangalan sa lista ng mga delinquent borrowers.</li>
            <li className="break-words">Ang pagpirma sa kasunduang ito ay patunay na ang NANGUTANG ay nagkasundo at sumasang-ayon sa lahat ng tuntunin at kundisyon.</li>
          </ol>
        </div>

        {/* DIGITAL SIGNATURE */}
        {digitalSignature && (
          <div className="mb-6 break-inside-avoid">
            <h2 className="font-bold text-lg border-b border-black pb-2 mb-4">DIGITAL SIGNATURE</h2>
            <div className="bg-white border border-gray-400 p-4 inline-block">
              <img 
                src={digitalSignature} 
                alt="Digital Signature" 
                className="max-h-32 object-contain print:invert"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Digitally signed by <strong>{firstName} {lastName}</strong>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-black text-xs text-gray-600 text-center break-inside-avoid">
          <p className="font-semibold mb-1">IMPORTANT: This is the official application receipt.</p>
          <p>Keep this document for your records. This receipt was generated from the loan application system.</p>
          <p className="mt-2 text-gray-400">Generated: {formatDateTime(new Date())}</p>
        </div>
      </div>
    </div>
  );
}
