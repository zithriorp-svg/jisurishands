import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get("user_role")?.value || "AGENT";
    const userName = cookieStore.get("user_name")?.value || "Unknown";

    let sender = "ADMIN";
    if (userRole === "AGENT") {
      sender = `AGENT (${userName})`;
    }

    const { clientId, message } = await req.json();

    if (!clientId || !message) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await prisma.message.create({
      data: {
        clientId,
        sender,
        text: message,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Comm-Link Send Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

