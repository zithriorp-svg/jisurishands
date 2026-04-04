import { prisma } from "@/lib/db";
import { getActivePortfolio } from "@/lib/portfolio";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache"; // 🚀 INJECTED: The UI Kicker

/**
 * DEBUG: Reset Specific Loan
 * Resets all installments for a specific loan to their original due dates
 * (based on loan start date + period offsets)
 */
export async function POST(req: Request) {
  try {
    const portfolio = await getActivePortfolio();
    const body = await req.json();
    const { loanId } = body;

    if (!loanId || isNaN(parseInt(loanId))) {
      return NextResponse.json({
        success: false,
        error: "Valid Loan ID is required"
      });
    }

    // Find the loan
    const loan = await prisma.loan.findFirst({
      where: {
        id: parseInt(loanId),
        portfolio
      },
      include: {
        installments: true,
        client: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!loan) {
      return NextResponse.json({
        success: false,
        error: `Loan #${loanId} not found in current portfolio`
      });
    }

    // 🚀 THE VAPORIZER: Obliterate all corrupted collection logs for this specific loan!
    const installmentIds = loan.installments.map(i => i.id);
    if (installmentIds.length > 0) {
      await prisma.collectionLog.deleteMany({
        where: { installmentId: { in: installmentIds } }
      });
    }

    // Calculate original due dates based on loan start date and term type
    const startDate = new Date(loan.startDate);
    const termType = loan.termType || "Months";
    const termDuration = loan.termDuration || 1;

    // Reset each installment to its original due date
    const updatePromises = loan.installments.map((installment) => {
      const periodNumber = installment.period;
      let newDueDate = new Date(startDate);

      // Calculate due date based on term type
      switch (termType.toLowerCase()) {
        case 'days':
          newDueDate.setDate(startDate.getDate() + periodNumber);
          break;
        case 'weeks':
          newDueDate.setDate(startDate.getDate() + (periodNumber * 7));
          break;
        case 'months':
        case 'monthly':
        default:
          newDueDate.setMonth(startDate.getMonth() + periodNumber);
          break;
      }

      return prisma.loanInstallment.update({
        where: { id: installment.id },
        data: {
          dueDate: newDueDate,
          status: 'PENDING',
          penaltyFee: 0,
          amountPaid: 0,
          principalPaid: 0,
          interestPaid: 0,
          paymentDate: null,
          paymentId: null
        }
      });
    });

    await Promise.all(updatePromises);

    // Also reset the loan's good payer discount if it was revoked
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        goodPayerDiscountRevoked: false
      }
    });

    // Log the debug action
    await prisma.auditLog.create({
      data: {
        type: 'RESET_LOAN',
        amount: 0,
        referenceId: loan.id,
        referenceType: 'LOAN',
        description: `DEBUG: Reset Loan #${loan.id} (${loan.client.firstName} ${loan.client.lastName}) - ${loan.installments.length} installments restored, corrupted logs vaporized.`,
        portfolio
      }
    });

    // 🚀 Force the UI to refresh instantly
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/agent-portal");
    revalidatePath("/clients/[id]", "page");

    return NextResponse.json({
      success: true,
      message: `Reset Loan #${loanId} for ${loan.client.firstName} ${loan.client.lastName}`,
      installmentsUpdated: loan.installments.length,
      loanId: loan.id,
      clientName: `${loan.client.firstName} ${loan.client.lastName}`
    });
  } catch (error) {
    console.error("Reset loan error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to reset loan"
    }, { status: 500 });
  }
}
