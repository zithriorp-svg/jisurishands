import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * CLIENT PORTAL LOGOUT
 * Clears all client session cookies
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all client session cookies
  response.cookies.set("client_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });

  response.cookies.set("client_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });

  response.cookies.set("client_name", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });

  return response;
}
