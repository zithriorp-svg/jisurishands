import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const application = await prisma.agentApplication.create({
      data: {
        firstName: data.firstName, lastName: data.lastName,
        phone: data.phone, fbProfileUrl: data.fbProfileUrl,
        address: data.address, incomeSource: data.incomeSource,
        grossIncome: Number(data.grossIncome), assetType: data.assetType,
        customAssetType: data.customAssetType || null, assetValue: Number(data.assetValue),
        assetSpecs: data.assetSpecs, idCardData: data.idCardData || null,
        selfieData: data.selfieData || null, signatureData: data.signatureData || null,
        collatFront: data.collatFront || null, collatRear: data.collatRear || null,
        collatLeft: data.collatLeft || null, collatRight: data.collatRight || null,
        collatSerial: data.collatSerial || null, collatDoc: data.collatDoc || null,
        status: "PENDING",
      },
    });
    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (error) {
    console.error("Agent App Error:", error);
    return NextResponse.json({ success: false, error: "Failed to secure application." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const phone = searchParams.get("phone"); // 👈 NEW: Search by Phone
    
    let application;
    
    if (id) {
      application = await prisma.agentApplication.findUnique({ where: { id: Number(id) } });
    } else if (phone) {
      application = await prisma.agentApplication.findFirst({ 
        where: { phone: phone }, 
        orderBy: { createdAt: 'desc' } // Gets their latest application
      });
    } else {
      return NextResponse.json({ error: "Missing ID or Phone" }, { status: 400 });
    }

    if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Database fetch failed." }, { status: 500 });
  }
}
