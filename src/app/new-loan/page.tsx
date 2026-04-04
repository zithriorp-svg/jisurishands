import Link from "next/link";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

async function issueLoan(formData: FormData) {
  "use server";
  const clientId = Number(formData.get("clientId"));
  const principal = Number(formData.get("principal"));
  const rate = Number(formData.get("rate"));
  const duration = Number(formData.get("duration")); // e.g. 30 days
  const agentIdValue = formData.get("agentId");
  const agentId = agentIdValue && agentIdValue !== "" ? Number(agentIdValue) : null;
  
  if (!clientId || !principal) return;

  // 1. Create the Loan attached to the selected client
  const newLoan = await prisma.loan.create({
    data: {
      clientId: clientId,
      principal: principal,
      interestRate: rate,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + duration)),
      agentId: agentId
    }
  });

  // 2. Record the Double-Entry Ledger
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  await prisma.ledger.create({
    data: {
      debitAccount: "Loans Receivable",
      creditAccount: "Vault Cash",
      amount: principal,
      transactionType: `Disbursement: ${client?.firstName} ${client?.lastName}`,
      loanId: newLoan.id
    }
  });
  redirect("/");
}

export default async function OriginationPage() {
  const portfolio = await getActivePortfolio();
  
  // Fetch active clients for the dropdown
  const clients = await prisma.client.findMany({ 
    where: { portfolio },
    orderBy: { lastName: 'asc' } 
  });

  // Fetch agents for the dropdown (Field Agents / Co-Makers)
  const agents = await prisma.agent.findMany({
    where: { portfolio },
    orderBy: { name: 'asc' }
  });

  // Fetch Vault Cash
  const cashOut = await prisma.ledger.aggregate({ where: { creditAccount: "Vault Cash", portfolio }, _sum: { amount: true } });
  const cashIn = await prisma.ledger.aggregate({ where: { debitAccount: "Vault Cash", portfolio }, _sum: { amount: true } });
  const capitalTx = await prisma.capitalTransaction.findMany({ where: { portfolio } });
  let totalDeposits = 0, totalWithdrawals = 0;
  capitalTx.forEach(tx => {
    if (tx.type === "DEPOSIT") totalDeposits += Number(tx.amount);
    else totalWithdrawals += Number(tx.amount);
  });
  const vaultCash = totalDeposits - totalWithdrawals - Number(cashOut._sum.amount || 0) + Number(cashIn._sum.amount || 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Loan Origination</h1>
          <p className="text-sm text-zinc-500">Portfolio: <span className="text-yellow-400">{portfolio}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
            <p className="text-xs text-zinc-500 uppercase">Vault Cash</p>
            <p className="text-lg font-bold text-emerald-400">₱{vaultCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
        </div>
      </div>

      {/* Form Area - Loan Parameters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-6">Loan Parameters</h2>
        <form action={issueLoan} className="space-y-5">
          {/* Client Selection */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Select Client</label>
            <select name="clientId" required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500">
              <option value="">-- Choose a Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>
              ))}
            </select>
          </div>

          {/* Agent / Co-Maker Selection */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Assigned Agent / Co-Maker</label>
            <select name="agentId" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500">
              <option value="">None (Direct Loan)</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name} - {agent.phone}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">If assigned, agent receives 40% commission on collected interest</p>
          </div>

          {/* Principal Amount */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Principal Amount (₱)</label>
            <input 
              type="number" 
              name="principal" 
              required 
              placeholder="0.00"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 text-xl font-bold"
            />
          </div>

          {/* Interest Rate and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Interest Rate (%)</label>
              <input 
                type="number" 
                name="rate" 
                defaultValue="5" 
                step="0.1"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Duration (Days)</label>
              <input 
                type="number" 
                name="duration" 
                defaultValue="30" 
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all uppercase tracking-wider"
            >
              Issue Loan & Disburse
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Agent Commission Structure</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800 rounded-xl p-4 text-center">
            <p className="text-xs text-zinc-500 uppercase mb-1">House Share</p>
            <p className="text-3xl font-bold text-blue-400">60%</p>
            <p className="text-xs text-zinc-500 mt-1">Retained in Vault</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4 text-center">
            <p className="text-xs text-zinc-500 uppercase mb-1">Agent Share</p>
            <p className="text-3xl font-bold text-emerald-400">40%</p>
            <p className="text-xs text-zinc-500 mt-1">Pending Payout</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-4 text-center">
          Commission is calculated on interest payments only. Agent commissions are tracked and can be settled from the Agent Command Center.
        </p>
      </div>
    </div>
  );
}
