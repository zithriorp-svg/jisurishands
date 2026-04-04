"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function sendPortalChatMessage(text: string) {
  if (!text || text.trim() === "") return { error: "Message cannot be empty." };

  try {
    const cookieStore = await cookies();
    const clientSession = cookieStore.get("client_session")?.value;
    const clientIdStr = cookieStore.get("client_id")?.value;

    // STRICT SECURITY: Only authenticated clients can send messages from this portal
    if (clientSession !== "authenticated" || !clientIdStr) {
      return { error: "Unauthorized transmission." };
    }

    const clientId = parseInt(clientIdStr);

    await prisma.message.create({
      data: {
        clientId,
        sender: "CLIENT",
        text: text.trim(),
      },
    });

    // Refresh the borrower portal to show the new message
    revalidatePath("/portal/dashboard");
    
    return { success: true };
  } catch (error: any) {
    console.error("Portal Chat Error:", error);
    return { error: "Failed to transmit message." };
  }
}

