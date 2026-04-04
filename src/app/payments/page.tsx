import { prisma } from "@/lib/db";
import PaymentTerminal from "./PaymentTerminal";
import { getActivePortfolio } from "@/lib/portfolio";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const portfolio = await getActivePortfolio();
  
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value || "AGENT";
  const userName = cookieStore.get("user_name")?.value;
  const isAdmin = userRole === "ADMIN";

  // ============================================================================
  // 🚀 AGENT IDENTITY PROTOCOL: Lock the dropdown to the specific agent
  // ============================================================================
  let agentFilter = {};
  
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
      agentFilter = { agentId: agentData.id };
    }
  }

  // 🔒 STRICT FETCH: Get only ACTIVE loans, filtered by the Agent's ID (if applicable)
  const loans = await prisma.loan.findMany({
    where: { 
      portfolio,
      status: "ACTIVE",
      ...agentFilter 
    },
    include: { client: true },
    orderBy: { id: 'desc' }
  });

  // Format for client component - include clientId for deep-linking
  const loanOptions = loans.map(loan => ({
    id: loan.id,
    clientId: loan.clientId,
    client: {
      firstName: loan.client.firstName,
      lastName: loan.client.lastName
    }
  }));

  return <PaymentTerminal loans={loanOptions} portfolio={portfolio} />;
}
