import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Renders with an empty dataset rather than crashing when Supabase credentials
 * are missing, so a fresh clone still boots. This explains the zeros.
 */
export function ConnectionNotice({ error }: { error?: string | null }) {
  if (!isSupabaseConfigured) {
    return (
      <Notice title="Supabase isn't connected yet">
        Set <Code>NEXT_PUBLIC_SUPABASE_URL</Code> and{" "}
        <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code> in <Code>.env.local</Code>,
        then run <Code>supabase/schema.sql</Code> against your project.
        Everything below reads zero because there is no database to query.
      </Notice>
    );
  }

  if (error) {
    return (
      <Notice title="Query failed" tone="loss">
        <span className="font-mono">{error}</span>
      </Notice>
    );
  }

  return null;
}

function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "loss";
}) {
  return (
    <div className="border border-border p-4">
      <p
        className={
          tone === "loss"
            ? "text-xs font-medium text-loss"
            : "text-xs font-medium text-foreground"
        }
      >
        {title}
      </p>
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
