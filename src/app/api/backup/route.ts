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

    // 🛡️ BULLETPROOF QUERIES: If a table is empty or missing, it won't crash the matrix
    let clients: any[] = [];
    let loans: any[] = [];
    let installments: any[] = [];
    let payments: any[] = [];
    let ledgers: any[] = [];
    let expenses: any[] = [];
    let capitalTx: any[] = [];
    let messages: any[] = [];

    try { clients = await prisma.client.findMany({ where: { portfolio } }); } catch(e) { console.error("Client extract skipped"); }
    try { loans = await prisma.loan.findMany({ where: { portfolio } }); } catch(e) { console.error("Loan extract skipped"); }
    
    const loanIds = loans.map(l => l.id);
    
    // 🛡️ ANTI-GHOST PROTOCOL: Only search for payments if loans actually exist
    if (loanIds.length > 0) {
      try { installments = await prisma.loanInstallment.findMany({ where: { loanId: { in: loanIds } } }); } catch(e) {}
      try { payments = await prisma.payment.findMany({ where: { loanId: { in: loanIds } } }); } catch(e) {}
    }
    
    try { ledgers = await prisma.ledger.findMany({ where: { portfolio } }); } catch(e) {}
    try { expenses = await prisma.expense.findMany({ where: { portfolio } }); } catch(e) {}
    try { capitalTx = await prisma.capitalTransaction.findMany({ where: { portfolio } }); } catch(e) {}
    try { messages = await prisma.clientMessage.findMany({ where: { client: { portfolio } } }); } catch(e) {}

    // Safe Date Formatter for CSV
    const safeDate = (d: any) => d ? (typeof d.toISOString === 'function' ? d.toISOString() : new Date(d).toISOString()) : '';

    // === JSON FORMAT (For Machine Restore) ===
    if (format === 'json') {
      const exportData = {
        portfolio,
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: { clients, loans, installments, payments, ledgers, expenses, capitalTx, messages }
      };

      // 🛡️ ANTI-BIGINT PROTOCOL: Safely stringify large database numbers so JSON doesn't choke
      const safeJsonString = JSON.stringify(exportData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2);

      return new NextResponse(safeJsonString, {
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
      csvData += `${c.id},"${c.firstName}","${c.lastName}","${c.phone}","${c.address || ''}",${safeDate(c.createdAt)}\n`;
    });
    csvData += "\n";

    csvData += "=== LOANS ===\n";
    csvData += "Loan ID,Client ID,Principal,Status,Term Duration,Term Type,Start Date,End Date\n";
    loans.forEach(l => {
      csvData += `${l.id},${l.clientId},${l.principal},${l.status},${l.termDuration},${l.termType},${safeDate(l.startDate)},${safeDate(l.endDate)}\n`;
    });
    csvData += "\n";

    csvData += "=== PAYMENTS ===\n";
    csvData += "Payment ID,Loan ID,Amount,Principal Portion,Interest Portion,Payment Date,Type\n";
    payments.forEach(p => {
      csvData += `${p.id},${p.loanId},${p.amount},${p.principalPortion},${p.interestPortion},${safeDate(p.paymentDate)},${p.paymentType}\n`;
    });
    csvData += "\n";

    csvData += "=== LEDGER TRANSACTIONS ===\n";
    csvData += "Ledger ID,Date,Type,Debit Account,Credit Account,Amount\n";
    ledgers.forEach(l => {
      const dateVal = safeDate(l.createdAt || l.date);
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
    return NextResponse.json({ error: "Failed to extract backup data. Check Vercel logs." }, { status: 500 });
  }
}
