import type { EmptyDiagnosis } from "@/lib/diagnostics";

/**
 * Turns a bare $0.00 into an explanation. Without this, "RLS is hiding your
 * data" and "this window really had no spend" look exactly the same.
 */
export function EmptyWindowNotice({
  diagnosis,
  rangeLabel,
}: {
  diagnosis: EmptyDiagnosis;
  rangeLabel: string;
}) {
  if (diagnosis.kind === "unknown") return null;

  if (diagnosis.kind === "error") {
    return (
      <Notice title="Couldn't read the runs table">
        <span className="font-mono">{diagnosis.message}</span>
      </Notice>
    );
  }

  if (diagnosis.kind === "no-rows-visible") {
    return (
      <Notice title="No runs are visible to this connection">
        Supabase answered without an error but returned no rows at all. Either
        the <Code>runs</Code> table is empty, or Row Level Security is hiding it
        from the anon key — PostgREST replies <Code>200</Code> with{" "}
        <Code>[]</Code> in both cases, so they look identical here. If the
        Supabase table editor shows rows, run the RLS policy block at the bottom
        of <Code>supabase/schema.sql</Code>. Run <Code>npm run doctor</Code> for
        a full check.
      </Notice>
    );
  }

  return (
    <Notice title={`No runs in ${rangeLabel}`}>
      There are {diagnosis.totalRuns.toLocaleString("en-US")} runs in the
      database, dated {diagnosis.earliest} to {diagnosis.latest} — none of them
      fall in the selected window, so $0.00 is correct for this range. Pick a
      wider range, or check whether your ingest has stopped.
    </Notice>
  );
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border p-4">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-2xs leading-relaxed text-secondary">{children}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-surface px-1 py-0.5 font-mono text-[0.65rem] text-foreground">
      {children}
    </code>
  );
}
