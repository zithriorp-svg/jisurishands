"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from 'next/cache';

export async function submitAgentApplication(data: any) {
  try {
    let networkSizeNum: number | null = null;
    if (data.networkSize) {
      if (data.networkSize === "1-10") networkSizeNum = 5;
      else if (data.networkSize === "11-30") networkSizeNum = 20;
      else if (data.networkSize === "31-50") networkSizeNum = 40;
      else if (data.networkSize === "50+") networkSizeNum = 50;
    }

    await (prisma.agentApplication as any).create({
      data: {
        portfolio: data.portfolio || "Main Portfolio",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        address: data.address || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        territory: data.territory || null,
        networkSize: networkSizeNum,
        employment: data.employment || null,
        
        selfieUrl: data.selfieUrl || null,
        idPhotoUrl: data.idPhotoUrl || null,
        clearanceUrl: data.clearanceUrl || null,
        
        // 🚀 THE MISSING LINKS: Explicitly catching the text fields so they don't drop!
        collateralType: data.collateralType || null,
        collateralValue: data.collateralValue ? Number(data.collateralValue) : null,
        collateralCondition: data.collateralCondition || null,
        
        collateralPhotoFront: data.collateralPhotoFront || null,
        collateralPhotoRear: data.collateralPhotoRear || null,
        collateralPhotoLeft: data.collateralPhotoLeft || null,
        collateralPhotoRight: data.collateralPhotoRight || null,
        collateralPhotoSerial: data.collateralPhotoSerial || null,
        collateralPhotoDocument: data.collateralPhotoDocument || null,

        digitalSignature: data.digitalSignature || null,
        status: "PENDING"
      }
    });

    revalidatePath("/");
    revalidatePath("/agents");
    return { success: true };
  } catch (dbError: any) {
    console.error("Agent Application Error:", dbError);
    return { error: `DATABASE ERROR: ${dbError.message}` };
  }
}
