import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes — redirect to / with ?auth=1 if no session cookie.
// Firebase Auth is client-side; the dashboard page also guards itself.
// This handles direct URL access (e.g. typing /dashboard while logged out).
const PROTECTED = ["/dashboard"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    const sessionCookie = req.cookies.get("__session");
    if (!sessionCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
