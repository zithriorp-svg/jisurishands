import Link from "next/link";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function recordPayment(formData: FormData) {
  "use server";
  const loanId = Number(formData.get("loanId"));
  const amount = Number(formData.get("amount"));
  const interest = Number(formData.get("interest"));
  if (!loanId || !amount) return;

  // 1. Record the Payment
  await prisma.payment.create({
    data: { loanId, amount, paymentDate: new Date() }
  });

  // 2. Ledger Entry: Cash goes UP, Receivable goes DOWN
  await prisma.ledger.create({
    data: {
      debitAccount: "Vault Cash",
      creditAccount: "Loans Receivable",
      amount: amount - interest,
      transactionType: `Loan Repayment (Principal) - Loan #${loanId}`,
    }
  });

  // 3. Ledger Entry for Interest Earned
  if (interest > 0) {
    await prisma.ledger.create({
      data: {
        debitAccount: "Vault Cash",
        creditAccount: "Interest Income",
        amount: interest,
        transactionType: `Interest Earned - Loan #${loanId}`,
      }
    });
  }
  redirect("/");
}

export default async function CollectionsPage() {
  const activeLoans = await prisma.loan.findMany({ include: { client: true } });
  // Fetch recent payments for the history card
  const recentPayments = await prisma.payment.findMany({
    include: { loan: { include: { client: true } } },
    orderBy: { id: 'desc' },
    take: 5
  });

  return (
    <main className="min-h-screen flex flex-col bg-[#0f0f13]">
      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center px-4 py-3 border-b border-[#1c1c21] bg-[#0f0f13] sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <span className="text-white font-extrabold text-xl tracking-wide">FinTech</span>
          <span className="bg-[#1c1c21] border border-[#2a2a35] text-xs px-3 py-1.5 rounded-full text-gray-300">
            Cebu Branch
          </span>
        </div>
        <div className="bg-[#1c1c21] border border-[#2a2a35] text-xs px-3 py-1.5 rounded-full font-bold">
          <span className="text-yellow-500">FY:</span> <span className="text-white">2026</span>
        </div>
      </header>

      {/* GLOBAL NAVIGATION */}
      <nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b border-[#1c1c21] hide-scrollbar bg-[#0f0f13]">
        <Link href="/" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Dashboard</Link>
        <Link href="/clients" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Clients</Link>
        <Link href="/new-loan" className="text-gray-500 font-medium pb-1 whitespace-nowrap hover:text-white">Origination</Link>
        <span className="text-[#00df82] font-bold border-b-2 border-[#00df82] pb-1 whitespace-nowrap">Payments</span>
        <span className="text-gray-500 font-medium pb-1 whitespace-nowrap">Treasury</span>
        <span className="text-gray-500 font-medium pb-1 whitespace-nowrap">Ledger</span>
        <span className="text-gray-500 font-medium pb-1 whitespace-nowrap">Audit Log</span>
        <span className="text-gray-500 font-medium pb-1 whitespace-nowrap">⚙️</span>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
        {/* View Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#00df82] mb-1 tracking-tight">Payment Processing</h1>
          <p className="text-gray-400 text-sm">Active Database: <span className="text-white font-medium">Main Branch (Cloud Edition)</span></p>
        </div>

        {/* Payment Dashboard Card */}
        <div className="bg-[#1c1c21] border border-[#2a2a35] rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1c23] px-5 py-3 border-b border-[#2a2a35]">
            <h2 className="text-white font-bold">Payment Dashboard</h2>
          </div>
          <form action={recordPayment} className="p-5 space-y-4">
            <div>
              <select name="loanId" required className="w-full bg-[#0f0f13] border border-[#2a2a35] rounded-lg p-3 text-white focus:outline-none focus:border-[#00df82]">
                <option value="">-- Select Active Loan --</option>
                {activeLoans.map(loan => (
                  <option key={loan.id} value={loan.id}>
                    {loan.client.firstName} {loan.client.lastName} (₱{Number(loan.principal)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input type="number" name="amount" required placeholder="Total Amount (₱)" className="w-full bg-[#0f0f13] border border-[#2a2a35] rounded-lg p-3 text-white focus:outline-none focus:border-[#00df82]" />
              </div>
              <div>
                <input type="number" name="interest" defaultValue="0" placeholder="Interest (₱)" className="w-full bg-[#0f0f13] border border-[#2a2a35] rounded-lg p-3 text-white focus:outline-none focus:border-[#00df82]" />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#00df82] hover:bg-[#00c271] text-[#0f0f13] font-bold py-3 rounded-lg shadow-lg transition-colors mt-2">
              Process Payment
            </button>
          </form>
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-[#1c1c21] border border-[#2a2a35] rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1c23] px-5 py-3 border-b border-[#2a2a35]">
            <h2 className="text-white font-bold">Recent Transactions</h2>
          </div>
          <div className="p-5">
            {recentPayments.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">No payments in this portfolio.</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map(payment => (
                  <div key={payment.id} className="flex justify-between items-center border-b border-[#2a2a35] pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-white">{payment.loan.client.firstName} {payment.loan.client.lastName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{payment.paymentDate.toLocaleDateString()}</p>
                    </div>
                    <p className="text-[#00df82] font-bold text-sm">+₱{payment.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
