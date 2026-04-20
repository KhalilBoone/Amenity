import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Firebase Auth is client-side (localStorage) — no session cookie is set.
// The dashboard page guards itself with client-side auth state.
// This middleware passes through all requests without redirecting.
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
