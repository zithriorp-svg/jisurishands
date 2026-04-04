import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AgentClientsClient from "./AgentClientsClient";

export const dynamic = "force-dynamic";

export default async function AgentClientsPage() {
  // Session validation
  const cookieStore = await cookies();
  const agentSession = cookieStore.get("agent_session");
  const agentIdCookie = cookieStore.get("agent_id");
  const agentNameCookie = cookieStore.get("agent_name");

  if (agentSession?.value !== "authenticated" || !agentIdCookie?.value) {
    redirect("/agent-portal");
  }

  const agentId = parseInt(agentIdCookie.value);
  if (isNaN(agentId) || agentId <= 0) {
    redirect("/agent-portal");
  }

  // Fetch ONLY this agent's loans with all necessary data
  const agentLoans = await prisma.loan.findMany({
    where: { agentId },
    include: {
      client: {
        include: {
          application: true // Include for FB profile URL
        }
      },
      installments: { 
        orderBy: { period: 'asc' } 
      },
      payments: { 
        orderBy: { paymentDate: 'desc' } 
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Build client map with all necessary data
  const clientMap = new Map<number, {
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    fbProfileUrl: string | null;
    messengerId: string | null;
    loans: typeof agentLoans;
  }>();

  agentLoans.forEach(loan => {
    const clientId = loan.client.id;
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        id: loan.client.id,
        firstName: loan.client.firstName,
        lastName: loan.client.lastName,
        phone: loan.client.phone,
        fbProfileUrl: loan.client.application?.fbProfileUrl || null,
        messengerId: loan.client.application?.messengerId || null,
        loans: []
      });
    }
    clientMap.get(clientId)!.loans.push(loan);
  });

  // Serialize clients for client component
  const clients = Array.from(clientMap.values()).map(client => ({
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    fbProfileUrl: client.fbProfileUrl,
    messengerId: client.messengerId,
    loans: client.loans.map(loan => ({
      id: loan.id,
      principal: Number(loan.principal),
      interestRate: Number(loan.interestRate),
      termDuration: loan.termDuration,
      totalRepayment: Number(loan.totalRepayment),
      status: loan.status,
      goodPayerDiscountRevoked: loan.goodPayerDiscountRevoked,
      startDate: loan.startDate,
      endDate: loan.endDate,
      installments: loan.installments.map(inst => ({
        period: inst.period,
        dueDate: inst.dueDate,
        expectedAmount: Number(inst.expectedAmount),
        principal: Number(inst.principal),
        interest: Number(inst.interest),
        penaltyFee: Number(inst.penaltyFee) || 0,
        status: inst.status,
        paymentDate: inst.paymentDate,
        amountPaid: Number(inst.amountPaid) || 0
      })),
      payments: loan.payments.map(p => ({
        amount: Number(p.amount)
      }))
    }))
  }));

  return (
    <AgentClientsClient 
      clients={clients} 
      agentName={agentNameCookie?.value || "Agent"} 
      agentId={agentId} 
    />
  );
}
