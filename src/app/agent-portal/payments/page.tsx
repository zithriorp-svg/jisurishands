import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgentPaymentsPage({ searchParams }: { searchParams: { clientId?: string } }) {
  const cookieStore = await cookies();
  const agentSession = cookieStore.get("agent_session");
  const agentIdCookie = cookieStore.get("agent_id");

  // Verify Agent Credentials
  if (agentSession?.value !== "authenticated" || !agentIdCookie?.value) {
    redirect("/agent-portal");
  }

  const agentId = parseInt(agentIdCookie.value);
  const clientId = searchParams.clientId ? parseInt(searchParams.clientId) : null;

  if (!clientId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <p className="text-rose-500 mb-4">Error: No client selected.</p>
        <Link href="/agent-portal" className="bg-zinc-800 px-4 py-2 rounded-xl">Return to HUD</Link>
      </div>
    );
  }

  // 🔒 SECURE FETCH: Get the specific loan for this client, ONLY if it belongs to this agent
  const loan = await prisma.loan.findFirst({
    where: {
      agentId: agentId,
      clientId: clientId,
      status: "ACTIVE"
    },
    include: { 
      client: true,
      installments: { orderBy: { period: 'asc' } }
    }
  });

  if (!loan) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <p className="text-rose-500 mb-4">Error: Loan not found or unauthorized access.</p>
        <Link href="/agent-portal" className="bg-zinc-800 px-4 py-2 rounded-xl">Return to HUD</Link>
      </div>
    );
  }

  // Find the next pending installment
  const nextInstallment = loan.installments.find(i => i.status === "PENDING" || i.status === "LATE" || i.status === "PARTIAL");

  return (
    <div className="min-h-screen bg-black p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <Link href="/agent-portal" className="text-emerald-500 text-sm font-bold uppercase tracking-widest">
            ← Back to HUD
          </Link>
          <span className="text-zinc-500 text-xs font-mono">SECURE TERMINAL</span>
        </div>

        {/* CLIENT INFO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Target Client</p>
          <h1 className="text-2xl font-black text-white uppercase">{loan.client.firstName} {loan.client.lastName}</h1>
          <p className="text-sm text-zinc-400 font-mono mt-1">TXN-{loan.id.toString().padStart(4, '0')} • {loan.client.phone}</p>
          
          <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between">
             <div>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Principal</p>
               <p className="text-lg font-black text-white">₱{Number(loan.principal).toLocaleString()}</p>
             </div>
             <div className="text-right">
               <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Remaining Balance</p>
               {/* Simplified remaining balance calculation for display */}
               <p className="text-lg font-black text-rose-400">₱{Number(loan.totalRepayment).toLocaleString()}</p>
             </div>
          </div>
        </div>

        {/* PAYMENT ACTION */}
        {nextInstallment ? (
          <div className="bg-emerald-950/20 border-2 border-emerald-900/50 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4">Process Payment</h2>
            
            <div className="bg-zinc-950 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Installment {nextInstallment.period}</span>
                <span className={`text-[10px] px-2 py-1 rounded font-black ${nextInstallment.status === 'LATE' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {nextInstallment.status}
                </span>
              </div>
              <p className="text-3xl font-black text-white">₱{Number(nextInstallment.expectedAmount).toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-2">Due: {new Date(nextInstallment.dueDate).toLocaleDateString()}</p>
            </div>

            {/* Note: This button currently just returns to the portal. In a real scenario, this would trigger a Server Action to process the payment. */}
            <form action={async () => {
              'use server';
              // The logic to actually process the payment goes here.
              // For now, we will redirect back to the portal to show the flow.
              redirect('/agent-portal');
            }}>
              <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all">
                Confirm Payment ₱{Number(nextInstallment.expectedAmount).toLocaleString()}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <span className="text-4xl block mb-4">✅</span>
            <p className="text-white font-bold uppercase tracking-widest">All Installments Paid</p>
          </div>
        )}

      </div>
    </div>
  );
}
