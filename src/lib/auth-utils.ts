import { cookies } from "next/headers";
import * as crypto from "crypto";

// Role type
export type Role = "ADMIN" | "AGENT";

// Admin-only routes that require ADMIN role
export const ADMIN_ROUTES = [
  "/treasury",
  "/accounting",
  "/analytics",
  "/audit",
  "/settings",
  "/agents",
];

// Check if a path requires ADMIN role
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

// Hash password using SHA256
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Session cookie names
export const SESSION_COOKIE = "vault_session";
export const ROLE_COOKIE = "vault_role";
export const USER_COOKIE = "vault_user";

// Get current user's role
export async function getUserRole(): Promise<Role | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get(ROLE_COOKIE)?.value;
  if (role === "ADMIN" || role === "AGENT") {
    return role as Role;
  }
  return null;
}

// Get current user info
export async function getCurrentUser(): Promise<{ id: number; username: string; role: Role; name: string | null } | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  const username = cookieStore.get(USER_COOKIE)?.value;
  const role = cookieStore.get(ROLE_COOKIE)?.value as Role | undefined;

  if (!userId || !username || !role) {
    return null;
  }

  return {
    id: parseInt(userId),
    username,
    role,
    name: null,
  };
}

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "ADMIN";
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value !== undefined;
}
