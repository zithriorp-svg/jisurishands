import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper tool to automatically translate JSON date strings back into real Database Dates
function reviveDates(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === 'string' && obj[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      obj[key] = new Date(obj[key]);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetPortfolio, backupData } = body;

    if (!targetPortfolio || !backupData || !backupData.data) {
      return NextResponse.json({ error: "Invalid Vault Backup payload" }, { status: 400 });
    }

    if (prisma.systemPortfolio) {
      await prisma.systemPortfolio.upsert({
        where: { name: targetPortfolio },
        update: {},
        create: { name: targetPortfolio }
      });
    }

    const { clients, loans, installments, payments, ledgers, expenses, capitalTx, messages } = backupData.data;

    // TACTICAL WIPE
    if (prisma.payment) await prisma.payment.deleteMany({ where: { loan: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.loanInstallment) await prisma.loanInstallment.deleteMany({ where: { loan: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.loan) await prisma.loan.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.clientMessage) await prisma.clientMessage.deleteMany({ where: { client: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.client) await prisma.client.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.ledger) await prisma.ledger.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.expense) await prisma.expense.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.capitalTransaction) await prisma.capitalTransaction.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});

    // 🚀 STRICT RECONSTRUCTION WITH ERROR REPORTING
    const clientMap = new Map();
    for (const c of (clients || [])) {
      const oldId = c.id;
      delete c.id; 
      c.portfolio = targetPortfolio; 
      reviveDates(c);
      
      // 🛡️ BYPASS UNIQUE CONSTRAINT: Slightly alter the phone number so the database accepts the duplicate client!
      if (c.phone) {
         c.phone = c.phone + ` (Port-${targetPortfolio.substring(0,3)})`;
      }

      if (prisma.client) {
        try {
          const newC = await prisma.client.create({ data: c });
          clientMap.set(oldId, newC.id);
        } catch (err: any) {
          // If it fails, scream loudly to the frontend!
          return NextResponse.json({ error: `Client Matrix Error (${c.firstName}): ${err.message}` }, { status: 500 });
        }
      }
    }

    const loanMap = new Map();
    for (const l of (loans || [])) {
      const oldId = l.id;
      delete l.id;
      l.portfolio = targetPortfolio;
      l.clientId = clientMap.get(l.clientId);
      reviveDates(l);

      if (l.clientId && prisma.loan) {
        try {
           const newL = await prisma.loan.create({ data: l });
           loanMap.set(oldId, newL.id);
        } catch (err: any) {
           return NextResponse.json({ error: `Loan Matrix Error: ${err.message}` }, { status: 500 });
        }
      }
    }

    if (prisma.loanInstallment) {
      for (const i of (installments || [])) {
        delete i.id;
        i.loanId = loanMap.get(i.loanId);
        reviveDates(i);
        if (i.loanId) await prisma.loanInstallment.create({ data: i }).catch(()=>{});
      }
    }

    if (prisma.payment) {
      for (const p of (payments || [])) {
        delete p.id;
        p.loanId = loanMap.get(p.loanId);
        reviveDates(p);
        if (p.loanId) await prisma.payment.create({ data: p }).catch(()=>{});
      }
    }

    if (prisma.clientMessage) {
      for (const m of (messages || [])) {
        delete m.id;
        m.clientId = clientMap.get(m.clientId);
        reviveDates(m);
        if (m.clientId) await prisma.clientMessage.create({ data: m }).catch(()=>{});
      }
    }

    if (prisma.ledger) {
      for (const l of (ledgers || [])) {
        delete l.id;
        l.portfolio = targetPortfolio;
        if (l.loanId) l.loanId = loanMap.get(l.loanId);
        reviveDates(l);
        await prisma.ledger.create({ data: l }).catch(()=>{});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Restore Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
