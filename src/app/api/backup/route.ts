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

    let clients: any[] = [];
    let loans: any[] = [];
    let installments: any[] = [];
    let payments: any[] = [];
    let ledgers: any[] = [];
    let expenses: any[] = [];
    let capitalTx: any[] = [];
    let messages: any[] = [];
    let applications: any[] = []; // 🚀 NEW: Added Applications Matrix

    try { clients = await prisma.client.findMany({ where: { portfolio } }); } catch(e) {}
    try { loans = await prisma.loan.findMany({ where: { portfolio } }); } catch(e) {}
    
    const loanIds = loans.map(l => l.id);
    if (loanIds.length > 0) {
      try { installments = await prisma.loanInstallment.findMany({ where: { loanId: { in: loanIds } } }); } catch(e) {}
      try { payments = await prisma.payment.findMany({ where: { loanId: { in: loanIds } } }); } catch(e) {}
    }
    
    try { ledgers = await prisma.ledger.findMany({ where: { portfolio } }); } catch(e) {}
    try { expenses = await prisma.expense.findMany({ where: { portfolio } }); } catch(e) {}
    try { capitalTx = await prisma.capitalTransaction.findMany({ where: { portfolio } }); } catch(e) {}
    try { messages = await prisma.clientMessage.findMany({ where: { client: { portfolio } } }); } catch(e) {}
    
    // 🚀 NEW: Fetch all applications linked to these clients
    const appIds = clients.map(c => c.applicationId).filter(id => id !== null);
    if (appIds.length > 0 && (prisma as any).application) {
        try { applications = await (prisma as any).application.findMany({ where: { id: { in: appIds } } }); } catch(e) {}
    }

    const safeDate = (d: any) => d ? (typeof d.toISOString === 'function' ? d.toISOString() : new Date(d).toISOString()) : '';

    if (format === 'json') {
      const exportData = {
        portfolio,
        timestamp: new Date().toISOString(),
        version: "1.1",
        data: { clients, loans, installments, payments, ledgers, expenses, capitalTx, messages, applications } // Added here
      };

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

    let csvData = `--- FINTECH VAULT BACKUP: ${portfolio.toUpperCase()} ---\n\n`;

    csvData += "=== CLIENTS ===\n";
    csvData += "ID,First Name,Last Name,Phone,Application ID,Created At\n";
    clients.forEach(c => {
      csvData += `${c.id},"${c.firstName}","${c.lastName}","${c.phone}","${c.applicationId || ''}",${safeDate(c.createdAt)}\n`;
    });
    csvData += "\n";

    csvData += "=== LOANS ===\n";
    csvData += "Loan ID,Client ID,Principal,Status,Term Duration,Term Type,Start Date,End Date\n";
    loans.forEach(l => {
      csvData += `${l.id},${l.clientId},${l.principal},${l.status},${l.termDuration},${l.termType},${safeDate(l.startDate)},${safeDate(l.endDate)}\n`;
    });
    csvData += "\n";

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="vault_backup_${portfolio.replace(/\s+/g, '_').toLowerCase()}.csv"`,
      },
    });

  } catch (error) {
    console.error("Backup extraction failed:", error);
    return NextResponse.json({ error: "Failed to extract backup data." }, { status: 500 });
  }
}
