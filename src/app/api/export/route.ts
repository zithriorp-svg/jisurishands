import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Fetch the entire ledger history
  const ledger = await prisma.ledger.findMany({
    orderBy: { id: "desc" }
  });

  // Build the CSV Headers
  let csv = "Transaction ID,Description,Debit Account,Credit Account,Amount (PHP)\n";

  // Format the data into CSV rows
  ledger.forEach((entry) => {
    // Escape quotes to prevent CSV breaking
    const safeDescription = entry.transactionType.replace(/"/g, '""');
    const formattedId = `TXN-${entry.id.toString().padStart(4, "0")}`;
    csv += `"${formattedId}","${safeDescription}","${entry.debitAccount}","${entry.creditAccount}",${entry.amount}\n`;
  });

  // Force the browser to download the file
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="FinTech_Vault_Backup.csv"`,
    },
  });
}
