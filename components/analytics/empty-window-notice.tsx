import type { EmptyDiagnosis } from "@/lib/diagnostics";

/**
 * Turns a bare $0.00 into an explanation. Without this, "RLS is hiding your
 * data" and "this window really had no spend" look exactly the same.
 *
 * Only the two misconfiguration cases get a bordered box. An empty window is
 * the ordinary outcome of picking a quiet date range, so it gets one quiet
 * centred line and nothing else.
 */
export function EmptyWindowNotice({
  diagnosis,
}: {
  diagnosis: EmptyDiagnosis | null;
}) {
  if (diagnosis === null || diagnosis.kind === "unknown") return <Quiet />;

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

  // Nothing is wrong — this window is simply quiet. The date span is kept as a
  // second, fainter line because it is the one fact that turns "empty" into
  // "empty here, try over there".
  return (
    <Quiet>
      Runs on record span {diagnosis.earliest} to {diagnosis.latest}
    </Quiet>
  );
}

/** The minimal empty state: centred, grey, no border, no colour. */
function Quiet({ children }: { children?: React.ReactNode }) {
  return (
    <div className="py-24 text-center">
      <p className="text-xs text-secondary">
        No campaign activity in this window
      </p>
      {children && (
        <p className="mt-1.5 text-2xs text-nav-muted">{children}</p>
      )}
    </div>
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
