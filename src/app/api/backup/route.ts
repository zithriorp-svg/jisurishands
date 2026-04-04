import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolio = searchParams.get('portfolio');

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio name is required" }, { status: 400 });
    }

    // Extract all core data for this specific portfolio
    const clients = await prisma.client.findMany({ where: { portfolio } });
    const loans = await prisma.loan.findMany({ where: { portfolio } });
    const payments = await prisma.payment.findMany({ where: { loan: { portfolio } } });
    const ledgers = await prisma.ledger.findMany({ where: { portfolio } });

    // Format Data into simple CSV strings
    let csvData = `--- FINTECH VAULT BACKUP: ${portfolio.toUpperCase()} ---\n\n`;

    // 1. CLIENTS
    csvData += "=== CLIENTS ===\n";
    csvData += "ID,First Name,Last Name,Phone,Address,Created At\n";
    clients.forEach(c => {
      csvData += `${c.id},"${c.firstName}","${c.lastName}","${c.phone}","${c.address || ''}",${c.createdAt.toISOString()}\n`;
    });
    csvData += "\n";

    // 2. LOANS
    csvData += "=== LOANS ===\n";
    csvData += "Loan ID,Client ID,Principal,Status,Term Duration,Term Type,Start Date,End Date\n";
    loans.forEach(l => {
      csvData += `${l.id},${l.clientId},${l.principal},${l.status},${l.termDuration},${l.termType},${l.startDate.toISOString()},${l.endDate.toISOString()}\n`;
    });
    csvData += "\n";

    // 3. PAYMENTS
    csvData += "=== PAYMENTS ===\n";
    csvData += "Payment ID,Loan ID,Amount,Principal Portion,Interest Portion,Payment Date,Type\n";
    payments.forEach(p => {
      csvData += `${p.id},${p.loanId},${p.amount},${p.principalPortion},${p.interestPortion},${p.paymentDate.toISOString()},${p.paymentType}\n`;
    });
    csvData += "\n";

    // 4. LEDGER
    csvData += "=== LEDGER TRANSACTIONS ===\n";
    csvData += "Ledger ID,Date,Type,Debit Account,Credit Account,Amount\n";
    ledgers.forEach(l => {
      csvData += `${l.id},${l.createdAt.toISOString() || l.date.toISOString()},${l.transactionType},${l.debitAccount},${l.creditAccount},${l.amount}\n`;
    });

    // Send the file down to the browser as a downloadable CSV
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="vault_backup_${portfolio.replace(/\s+/g, '_').toLowerCase()}.csv"`,
      },
    });

  } catch (error) {
    console.error("Backup extraction failed:", error);
    return NextResponse.json({ error: "Failed to extract backup data" }, { status: 500 });
  }
}

