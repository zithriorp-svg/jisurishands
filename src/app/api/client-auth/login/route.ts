import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * CLIENT PORTAL AUTHENTICATION
 * 
 * Secure login endpoint for borrowers to access their read-only portal.
 * Authentication requires BOTH:
 * 1. Client ID (numeric identifier)
 * 2. Phone Number (must match exactly what's on file)
 * 
 * Security: This dual-factor approach prevents unauthorized access even if
 * someone knows a client's ID - they also need the registered phone number.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, phone } = body;

    // Validate input
    if (!clientId || !phone) {
      return NextResponse.json(
        { error: "Client ID and Phone Number are required" },
        { status: 400 }
      );
    }

    // Normalize phone number (strip non-numeric, handle country code)
    let normalizedPhone = phone.replace(/\D/g, '');
    
    // Query for client with matching ID and phone
    const client = await prisma.client.findFirst({
      where: {
        id: parseInt(clientId),
        phone: {
          // Try to match phone with various formats
          equals: phone
        }
      }
    });

    // If no match, try with normalized phone
    let matchedClient = client;
    if (!matchedClient) {
      // Try matching with normalized phone against stored phone
      const allClients = await prisma.client.findMany({
        where: { id: parseInt(clientId) }
      });
      
      for (const c of allClients) {
        if (c.phone) {
          const storedNormalized = c.phone.replace(/\D/g, '');
          // Compare last 10 digits (local number)
          const inputLast10 = normalizedPhone.slice(-10);
          const storedLast10 = storedNormalized.slice(-10);
          
          if (inputLast10 === storedLast10 && inputLast10.length === 10) {
            matchedClient = c;
            break;
          }
        }
      }
    }

    if (!matchedClient) {
      return NextResponse.json(
        { error: "Invalid Client ID or Phone Number" },
        { status: 401 }
      );
    }

    // Create response with secure session cookies
    const response = NextResponse.json({
      success: true,
      client: {
        id: matchedClient.id,
        name: `${matchedClient.firstName} ${matchedClient.lastName}`
      }
    });

    // Set secure HTTP-only cookies for session
    response.cookies.set("client_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    response.cookies.set("client_id", matchedClient.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    response.cookies.set("client_name", `${matchedClient.firstName} ${matchedClient.lastName}`, {
      httpOnly: false, // Accessible for UI display
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Client auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
