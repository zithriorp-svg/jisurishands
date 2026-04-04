import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolio = searchParams.get('portfolio');
    const format = searchParams.get('format') || 'csv';

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio name is required" }, { status: 400 });
    }

    // Extract all core data for this specific portfolio
    const clients = await prisma.client.findMany({ where: { portfolio } });
    const loans = await prisma.loan.findMany({ where: { portfolio } });
    
    const loanIds = loans.map(l => l.id);
    const installments = await prisma.loanInstallment.findMany({ where: { loanId: { in: loanIds } } });
    const payments = await prisma.payment.findMany({ where: { loanId: { in: loanIds } } });
    
    const ledgers = await prisma.ledger.findMany({ where: { portfolio } });
    const expenses = await prisma.expense.findMany({ where: { portfolio } });
    const capitalTx = await prisma.capitalTransaction.findMany({ where: { portfolio } });
    const messages = await prisma.clientMessage.findMany({ where: { client: { portfolio } } });

    // === JSON FORMAT (For Machine Restore) ===
    if (format === 'json') {
      const exportData = {
        portfolio,
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: { clients, loans, installments, payments, ledgers, expenses, capitalTx, messages }
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="vault_backup_${portfolio.replace(/\s+/g, '_').toLowerCase()}.json"`,
        },
      });
    }

    // === CSV FORMAT (For Human Excel/Reading) ===
    let csvData = `--- FINTECH VAULT BACKUP: ${portfolio.toUpperCase()} ---\n\n`;

    csvData += "=== CLIENTS ===\n";
    csvData += "ID,First Name,Last Name,Phone,Address,Created At\n";
    clients.forEach(c => {
      csvData += `${c.id},"${c.firstName}","${c.lastName}","${c.phone}","${c.address || ''}",${c.createdAt.toISOString()}\n`;
    });
    csvData += "\n";

    csvData += "=== LOANS ===\n";
    csvData += "Loan ID,Client ID,Principal,Status,Term Duration,Term Type,Start Date,End Date\n";
    loans.forEach(l => {
      csvData += `${l.id},${l.clientId},${l.principal},${l.status},${l.termDuration},${l.termType},${l.startDate.toISOString()},${l.endDate.toISOString()}\n`;
    });
    csvData += "\n";

    csvData += "=== PAYMENTS ===\n";
    csvData += "Payment ID,Loan ID,Amount,Principal Portion,Interest Portion,Payment Date,Type\n";
    payments.forEach(p => {
      csvData += `${p.id},${p.loanId},${p.amount},${p.principalPortion},${p.interestPortion},${p.paymentDate.toISOString()},${p.paymentType}\n`;
    });
    csvData += "\n";

    csvData += "=== LEDGER TRANSACTIONS ===\n";
    csvData += "Ledger ID,Date,Type,Debit Account,Credit Account,Amount\n";
    ledgers.forEach(l => {
      const dateVal = l.createdAt ? l.createdAt.toISOString() : (l.date ? l.date.toISOString() : '');
      csvData += `${l.id},${dateVal},${l.transactionType},${l.debitAccount},${l.creditAccount},${l.amount}\n`;
    });

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
