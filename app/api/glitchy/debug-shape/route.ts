import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Reports the structure of a Glitchy response without dumping its contents,
 * so response shapes can be diagnosed without exposing figures or the token.
 */
function describe(value: unknown, depth = 0): unknown {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      firstItemKeys:
        value.length > 0 && value[0] && typeof value[0] === "object"
          ? Object.keys(value[0] as object).slice(0, 12)
          : typeof value[0],
    };
  }
  if (typeof value !== "object") return typeof value;
  if (depth >= 2) return "object";

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    out[k] = describe(v, depth + 1);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const token = process.env.GLITCHY_TOKEN;
  if (!token) return NextResponse.json({ error: "GLITCHY_TOKEN not set" });

  const range = req.nextUrl.searchParams.get("range") || "Yesterday";

  const res = await fetch(
    `https://api.glitchy.com/v3/stats?rangeTypeValue=${range}&groupBySource=true`,
    {
      headers: {
        Cookie: `glitchy_token=${token}`,
        Accept: "application/json",
        Origin: "https://app.glitchy.com",
        Referer: "https://app.glitchy.com/",
        "x-app-platform": "web",
        "x-app-version": "3.0.1",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ range, status: res.status });
  }

  const json = await res.json();
  return NextResponse.json({ range, status: 200, shape: describe(json) });
}
