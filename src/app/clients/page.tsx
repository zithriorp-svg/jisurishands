import Link from "next/link";
import { prisma } from "@/lib/db";
import { Phone, MapPin } from "lucide-react";
import { getActivePortfolio } from "@/lib/portfolio";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const portfolio = await getActivePortfolio();
  
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value || "AGENT";
  const userName = cookieStore.get("user_name")?.value;
  const isAdmin = userRole === "ADMIN";

  // ============================================================================
  // 🚀 AGENT IDENTITY PROTOCOL: Lock the client list to the specific agent
  // ============================================================================
  let clientFilter: any = { portfolio };
  let loanFilter: any = {};

  if (!isAdmin && userName && userName !== "User") {
    const agentData = await prisma.agent.findFirst({
      where: {
        OR: [
          { username: userName },
          { name: userName }
        ]
      }
    });
    
    if (agentData) {
      // 🔒 Filter 1: Only get clients who have at least one loan assigned to this agent
      clientFilter.loans = { some: { agentId: agentData.id } };
      
      // 🔒 Filter 2: Only fetch the specific loans assigned to this agent for accurate financial math
      loanFilter = { agentId: agentData.id };
    }
  }

  const clients = await prisma.client.findMany({
    where: clientFilter,
    include: { 
      loans: { 
        where: loanFilter,
        include: { 
          payments: true,
          installments: true
        } 
      } 
    },
    orderBy: { id: 'desc' }
  });
  const totalClients = clients.length;

  // Calculate client stats (now safely isolated to the agent's assigned loans)
  const clientStats = clients.map(client => {
    const totalBorrowed = client.loans.reduce((sum, l) => sum + Number(l.principal), 0);
    const totalRepaid = client.loans.reduce((sum, l) => 
      sum + l.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0
    );
    const activeLoans = client.loans.filter(l => {
      const paid = l.payments.reduce((s, p) => s + Number(p.amount), 0);
      return paid < Number(l.totalRepayment);
    }).length;
    
    // Calculate risk score
    let riskScore = 100;
    client.loans.forEach(loan => {
      loan.installments.forEach(inst => {
        if (inst.status === "LATE") riskScore -= 5;
        if (inst.status === "MISSED") riskScore -= 15;
      });
    });
    riskScore = Math.max(0, Math.min(100, riskScore));

    return { totalBorrowed, totalRepaid, activeLoans, riskScore };
  });

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        {/* Header */}
        <div className="flex justify-between items-start pt-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Client Command Center</h1>
            <p className="text-sm text-zinc-500">Portfolio: <span className="text-yellow-400">{portfolio}</span></p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl min-w-[100px]">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Total</span>
            <p className="text-2xl font-bold text-white">{totalClients}</p>
          </div>
        </div>

        {/* Client List */}
        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <p className="text-zinc-400 font-medium">No clients found in your assigned sector.</p>
              {isAdmin && <Link href="/apply" className="mt-4 text-blue-400 hover:underline">Add New Client →</Link>}
            </div>
          ) : (
            clients.map((client, idx) => {
              const stats = clientStats[idx];
              const riskColor = stats.riskScore >= 80 ? 'text-emerald-400' : 
                               stats.riskScore >= 60 ? 'text-yellow-400' : 
                               stats.riskScore >= 40 ? 'text-orange-400' : 'text-red-400';
              
              return (
                <Link 
                  key={client.id} 
                  href={`/clients/${client.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-blue-400 font-bold text-xl">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">{client.firstName} {client.lastName}</h2>
                        <p className="text-xs text-zinc-500">ID: {client.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stats.activeLoans > 0 && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                          {stats.activeLoans} Active
                        </span>
                      )}
                      <span className={`text-sm font-bold ${riskColor}`}>
                        {stats.riskScore}%
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex gap-4 text-xs text-zinc-500 mb-4">
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </span>
                    )}
                    {client.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {client.address}
                      </span>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-zinc-500">Borrowed</p>
                      <p className="text-sm font-bold text-white">₱{stats.totalBorrowed.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-zinc-500">Repaid</p>
                      <p className="text-sm font-bold text-emerald-400">₱{stats.totalRepaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-zinc-500">Loans</p>
                      <p className="text-sm font-bold text-blue-400">{client.loans.length}</p>
                    </div>
                  </div>

                  <p className="text-right text-xs text-zinc-500 mt-3">
                    View Profile →
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
