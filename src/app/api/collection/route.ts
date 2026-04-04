import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/**
 * RCI: Collection CRM API
 * 
 * GET: Fetch collection notes for an installment
 * POST: Add a collection note or apply penalty
 */

// GET: Fetch collection notes for an installment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const installmentId = searchParams.get('installmentId');
    
    if (!installmentId) {
      return NextResponse.json({ error: 'installmentId required' }, { status: 400 });
    }

    const notes = await prisma.collectionNote.findMany({
      where: { installmentId: parseInt(installmentId) },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Collection notes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch collection notes' }, { status: 500 });
  }
}

// POST: Add a collection note or apply penalty
export async function POST(request: NextRequest) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await request.json();
    
    const { action, installmentId, note, agentId, promisedDate, penaltyAmount } = body;

    if (!installmentId) {
      return NextResponse.json({ error: 'installmentId required' }, { status: 400 });
    }

    // Verify installment exists and belongs to this portfolio
    const installment = await prisma.loanInstallment.findFirst({
      where: { id: installmentId },
      include: { loan: true }
    });

    if (!installment || installment.loan.portfolio !== portfolio) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    if (action === 'note') {
      // Add collection note
      const collectionNote = await prisma.collectionNote.create({
        data: {
          installmentId,
          note,
          agentId: agentId || null,
          promisedDate: promisedDate ? new Date(promisedDate) : null
        }
      });

      return NextResponse.json({ 
        success: true, 
        note: collectionNote 
      });

    } else if (action === 'penalty') {
      // REBATE TRAP: Apply penalty as revoked 4% Good Payer Discount
      // Calculate 4% of the loan principal (the discount they lose)
      const loanPrincipal = Number(installment.loan.principal);
      const revokedDiscountAmount = Math.round(loanPrincipal * 0.04 * 100) / 100; // 4% of principal
      const amount = penaltyAmount || revokedDiscountAmount;
      
      const updatedInstallment = await prisma.loanInstallment.update({
        where: { id: installmentId },
        data: {
          penaltyFee: installment.penaltyFee + amount
        }
      });

      // Log the penalty as a collection note - REBATE TRAP messaging
      await prisma.collectionNote.create({
        data: {
          installmentId,
          note: `🚨 DISCOUNT REVOKED: 4% Good Payer Discount (₱${amount.toLocaleString()}) forfeited due to late payment. Total penalties: ₱${updatedInstallment.penaltyFee}`,
          agentId: agentId || null
        }
      });

      return NextResponse.json({ 
        success: true, 
        installment: {
          id: updatedInstallment.id,
          penaltyFee: Number(updatedInstallment.penaltyFee)
        }
      });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "note" or "penalty"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Collection action error:', error);
    return NextResponse.json({ error: 'Failed to process collection action' }, { status: 500 });
  }
}
