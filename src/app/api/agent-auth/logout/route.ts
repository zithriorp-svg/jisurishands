import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * AGENT PORTAL LOGOUT
 * Clears agent session cookies
 */
export async function POST() {
  const cookieStore = await cookies();
  
  cookieStore.delete("agent_session");
  cookieStore.delete("agent_id");
  cookieStore.delete("agent_name");

  return NextResponse.json({ success: true });
}
