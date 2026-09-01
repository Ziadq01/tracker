import { NextResponse } from "next/server";

import { AUTH_COOKIE, SESSION_MAX_AGE, safeEqual, sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  let submitted = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    submitted = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (!safeEqual(submitted, password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: AUTH_COOKIE,
    value: await sessionToken(password),
    maxAge: SESSION_MAX_AGE,
    // Not readable from JavaScript, so an injected script cannot lift it.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}
