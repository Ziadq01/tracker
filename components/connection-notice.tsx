import { AlertTriangle, Database } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * ADRIX renders with an empty dataset rather than crashing when Supabase
 * credentials are missing — a fresh clone or a preview deploy without secrets
 * should still show the shell. This banner explains why everything reads zero.
 */
export function ConnectionNotice({ error }: { error?: string | null }) {
  if (!isSupabaseConfigured) {
    return (
      <Notice
        icon={<Database className="h-4 w-4 text-primary" />}
        title="Supabase isn't connected yet"
        body={
          <>
            Set <Code>NEXT_PUBLIC_SUPABASE_URL</Code> and{" "}
            <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code> in{" "}
            <Code>.env.local</Code>, then run{" "}
            <Code>supabase/schema.sql</Code> against your project. Every metric
            below is showing zero because there is no database to read.
          </>
        }
      />
    );
  }

  if (error) {
    return (
      <Notice
        icon={<AlertTriangle className="h-4 w-4 text-loss" />}
        title="Query failed"
        body={<span className="font-mono text-2xs">{error}</span>}
        tone="loss"
      />
    );
  }

  return null;
}

function Notice({
  icon,
  title,
  body,
  tone = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  tone?: "primary" | "loss";
}) {
  return (
    <div
      className={
        tone === "loss"
          ? "flex items-start gap-3 rounded-lg border border-loss/30 bg-loss/[0.06] p-3"
          : "flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/[0.06] p-3"
      }
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-2xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.65rem] text-foreground">
      {children}
    </code>
  );
}
