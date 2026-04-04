import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that don't require Master Admin authentication
// These paths have their OWN authentication systems:
// - /agent-portal: Uses agent_session cookie (Agent Portal auth)
// - /portal: Uses client_session cookie (Client Portal auth)
// - /api/*: API routes handle their own auth
// - /login, /apply, /agent-apply: Public landing pages
const PUBLIC_PATHS = [
  "/login",
  "/apply",
  "/agent-apply",
  "/agent-portal",      // Has own agent auth system
  "/portal",            // Has own client auth system
  "/api",               // API routes handle their own auth
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const session = request.cookies.get("vault_session")?.value;

  // Only redirect to /login if NOT a public path and NOT authenticated as Master Admin
  if (!isPublic && session !== "authenticated") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already authenticated as Master Admin, don't show login page
  if (pathname === "/login" && session === "authenticated") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
