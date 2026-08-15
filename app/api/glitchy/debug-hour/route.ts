import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.GLITCHY_TOKEN;
  if (!token) return NextResponse.json({ error: "no token" });

  const res = await fetch(
    "https://api.glitchy.com/v3/stats?rangeTypeValue=Today&groupBySource=true",
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

  if (!res.ok) return NextResponse.json({ error: res.status });

  const json = await res.json();
  const stats = json.data ?? [];

  const now = new Date();
  const currentHourIntl = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const currentHour = (currentHourIntl.find((p: any) => p.type === "hour")?.value ?? "00").padStart(2, "0");

  const sample = stats.slice(0, 5).map((s: any) => ({
    date: s.Stat.date,
    hour: s.Stat.hour,
    source: s.Stat.source,
    clicks: s.Stat.clicks,
  }));

  const allHours = [...new Set(stats.map((s: any) => s.Stat.hour))].sort();

  return NextResponse.json({
    totalStats: stats.length,
    currentHourFilter: currentHour,
    serverTimeUTC: now.toISOString(),
    allHoursInData: allHours,
    sample,
  });
}
