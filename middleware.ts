import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  // Unset password means the gate is not configured. Failing open keeps a
  // fresh clone or a preview build usable instead of redirecting forever to a
  // login nobody can pass.
  if (!password) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;

  if (cookie && safeEqual(cookie, await sessionToken(password))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // Carry the attempted path so the login can return the visitor to it.
  url.search =
    req.nextUrl.pathname === "/"
      ? ""
      : `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except: the login page itself, API routes, Next's build
     * output, and the static files the PWA needs before sign-in (icons,
     * manifest, service worker, notification sound).
     */
    "/((?!login|api|_next/static|_next/image|favicon\\.ico|icon-|manifest\\.json|sw\\.js|sounds/).*)",
  ],
};
