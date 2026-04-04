"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const MASTER_PASSWORD = "Davidcaleb52019***";

export async function login(password: string) {
  if (password === MASTER_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("vault_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return true;
  }
  return false;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("vault_session");
  redirect("/login");
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get("vault_session")?.value === "authenticated";
}
