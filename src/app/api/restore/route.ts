import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetPortfolio, backupData } = body;

    if (!targetPortfolio || !backupData || !backupData.data) {
      return NextResponse.json({ error: "Invalid Vault Backup payload" }, { status: 400 });
    }

    // 🚀 NEW: Officially register the new portfolio name in the system so it appears in the dropdown!
    if (prisma.systemPortfolio) {
      await prisma.systemPortfolio.upsert({
        where: { name: targetPortfolio },
        update: {},
        create: { name: targetPortfolio }
      });
    }

    const { clients, loans, installments, payments, ledgers, expenses, capitalTx, messages } = backupData.data;

    // 🛡️ ARMORED TACTICAL WIPE (Only affects the specific target portfolio name you provide)
    if (prisma.payment) await prisma.payment.deleteMany({ where: { loan: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.loanInstallment) await prisma.loanInstallment.deleteMany({ where: { loan: { portfolio: targetPortfolio } } }).catch(()=>{});
    if (prisma.loan) await prisma.loan.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    
    if (prisma.clientMessage) await prisma.clientMessage.deleteMany({ where: { client: { portfolio: targetPortfolio } } }).catch(()=>{});
    if ((prisma as any).message) await (prisma as any).message.deleteMany({ where: { client: { portfolio: targetPortfolio } } }).catch(()=>{});
    
    if (prisma.client) await prisma.client.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.ledger) await prisma.ledger.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.expense) await prisma.expense.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});
    if (prisma.capitalTransaction) await prisma.capitalTransaction.deleteMany({ where: { portfolio: targetPortfolio } }).catch(()=>{});

    // RECONSTRUCTION (Injects data strictly into the new portfolio name)
    const clientMap = new Map();
    for (const c of (clients || [])) {
      const oldId = c.id;
      delete c.id; 
      c.portfolio = targetPortfolio;
      if (prisma.client) {
        const newC = await prisma.client.create({ data: c }).catch(()=>null);
        if (newC) clientMap.set(oldId, newC.id);
      }
    }

    const loanMap = new Map();
    for (const l of (loans || [])) {
      const oldId = l.id;
      delete l.id;
      l.portfolio = targetPortfolio;
      l.clientId = clientMap.get(l.clientId);
      if (l.clientId && prisma.loan) {
        const newL = await prisma.loan.create({ data: l }).catch(()=>null);
        if (newL) loanMap.set(oldId, newL.id);
      }
    }

    if (prisma.loanInstallment) {
      for (const i of (installments || [])) {
        delete i.id;
        i.loanId = loanMap.get(i.loanId);
        if (i.loanId) await prisma.loanInstallment.create({ data: i }).catch(()=>{});
      }
    }

    if (prisma.payment) {
      for (const p of (payments || [])) {
        delete p.id;
        p.loanId = loanMap.get(p.loanId);
        if (p.loanId) await prisma.payment.create({ data: p }).catch(()=>{});
      }
    }

    if (prisma.clientMessage) {
      for (const m of (messages || [])) {
        delete m.id;
        m.clientId = clientMap.get(m.clientId);
        if (m.clientId) await prisma.clientMessage.create({ data: m }).catch(()=>{});
      }
    }

    if (prisma.ledger) {
      for (const l of (ledgers || [])) {
        delete l.id;
        l.portfolio = targetPortfolio;
        if (l.loanId) l.loanId = loanMap.get(l.loanId);
        await prisma.ledger.create({ data: l }).catch(()=>{});
      }
    }

    if (prisma.expense) {
      for (const e of (expenses || [])) {
        delete e.id;
        e.portfolio = targetPortfolio;
        await prisma.expense.create({ data: e }).catch(()=>{});
      }
    }

    if (prisma.capitalTransaction) {
      for (const c of (capitalTx || [])) {
        delete c.id;
        c.portfolio = targetPortfolio;
        await prisma.capitalTransaction.create({ data: c }).catch(()=>{});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Restore Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
