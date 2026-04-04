import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // 💥 THE GLOBAL WIPE: Destroy every specific token your system uses
  cookieStore.delete("vault_session"); // The Main Vault Key
  cookieStore.delete("user_role");     // The Role Key
  cookieStore.delete("user_name");     // The Identity Key
  cookieStore.delete("agent_session"); // The old Side-Door Key
  cookieStore.delete("agent_id");      // The old Agent Identity Key

  // Force redirect back to the standard login screen
  return NextResponse.redirect(new URL("/login", req.url));
}

