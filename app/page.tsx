import { redirect } from "next/navigation";

/**
 * The dashboard lives at /analytics. The root keeps working — and carries any
 * range/granularity params straight through — so old links don't break.
 */
export default function RootPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  const query = params.toString();
  redirect(query ? `/analytics?${query}` : "/analytics");
}
