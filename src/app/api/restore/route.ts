import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const { clients, loans, installments, payments, ledgers, expenses, capitalTx, messages, applications } = backupData.data;

    // Destroy Collection Notes
    if ((prisma as any).collectionNote) {
      await (prisma as any).collectionNote.deleteMany({ 
        where: { installment: { loan: { portfolio: targetPortfolio } } } 
      }).catch(()=>{});
    }

    // TACTICAL WIPE
    if (prisma.payment) await prisma.payment.deleteMany({ where: { loan: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.loanInstallment) await prisma.loanInstallment.deleteMany({ where: { loan: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.loan) await prisma.loan.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.clientMessage) await prisma.clientMessage.deleteMany({ where: { client: { portfolio: targetPortfolio } } }).catch(()=>{});
    if ((prisma as any).message) await (prisma as any).message.deleteMany({ where: { client: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.client) await prisma.client.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.ledger) await prisma.ledger.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.expense) await prisma.expense.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.capitalTransaction) await prisma.capitalTransaction.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});

    // 🚀 1. RECONSTRUCT APPLICATIONS FIRST
    const appMap = new Map();
    if ((prisma as any).application) {
       for (const app of (applications || [])) {
         const oldId = app.id;
         delete app.id;
         if (app.portfolio) app.portfolio = targetPortfolio; 
         reviveDates(app);
         
         try {
           const newApp = await (prisma as any).application.create({ data: app });
           appMap.set(oldId, newApp.id);
         } catch (e) { console.error("App restore skipped", e); }
       }
    }

    // 🚀 2. RECONSTRUCT CLIENTS (And attach the newly generated Application IDs!)
    const clientMap = new Map();
    for (const c of (clients || [])) {
      const oldId = c.id;
      delete c.id; 
      c.portfolio = targetPortfolio; 
      reviveDates(c);
      
      if (c.phone) c.phone = c.phone + ` (P-${targetPortfolio.substring(0,3)})`;
      
      // LINK THE CORRECT APPLICATION
      if (c.applicationId && appMap.has(c.applicationId)) {
          c.applicationId = appMap.get(c.applicationId);
      } else {
          c.applicationId = null; // Only null it if the application backup truly failed/didn't exist
      }

      if (prisma.client) {
        try {
          const newC = await prisma.client.create({ data: c });
          clientMap.set(oldId, newC.id);
        } catch (err: any) {
          return NextResponse.json({ error: `Client Matrix Error (${c.firstName}): ${err.message}` }, { status: 500 });
        }
      }
    }

    // 🚀 3. RESTORE EVERYTHING ELSE
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
