"use client";

import * as React from "react";

import { createRun, deleteRun, updateRun } from "@/lib/actions";
import type { RunView } from "@/lib/campaign-ui";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/metrics";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

/**
 * Inline run breakdown for one campaign, indented behind a 2px rule so it reads
 * as subordinate to its parent row.
 *
 * Edit and Delete are text rather than icons — the design allows no icons
 * beyond the status dots and the theme switch. From md up they stay invisible
 * until the run row is hovered or focused; on touch, where there is no hover to
 * reveal them with, they are always visible.
 */
export function RunBreakdown({
  campaignId,
  runs,
}: {
  campaignId: string;
  runs: RunView[];
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    onDone?: () => void
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDone?.();
      else setError(result.error ?? "Something went wrong.");
    });
  };

  return (
    <div
      className="ml-8 border-l-2 border-border pl-4"
      onClick={(event) => event.stopPropagation()}
      role="presentation"
    >
      {runs.length === 0 && !adding ? (
        <p className="py-3 text-xs text-secondary">No runs in this window.</p>
      ) : (
        runs.map((run) =>
          editing === run.id ? (
            <RunForm
              key={run.id}
              run={run}
              pending={pending}
              onCancel={() => setEditing(null)}
              onSubmit={(formData) =>
                submit(
                  () => updateRun(run.id, formData),
                  () => setEditing(null)
                )
              }
            />
          ) : (
            <div
              key={run.id}
              className="group flex items-center gap-4 py-2.5 pr-3 text-xs transition-colors duration-100 md:py-2"
            >
              <span className="tnum w-[3.5rem] shrink-0 whitespace-nowrap text-foreground">
                {run.runDateLabel}
              </span>

              <RunCell>{formatCurrency(run.adSpend)}</RunCell>
              <RunCell>{formatCurrency(run.revenue)}</RunCell>

              <span
                className={cn(
                  "tnum w-[5rem] shrink-0 text-right",
                  profitTone(run.metrics.profit) === "profit"
                    ? "text-profit"
                    : profitTone(run.metrics.profit) === "loss"
                      ? "text-loss"
                      : "text-foreground"
                )}
              >
                {formatCurrency(run.metrics.profit)}
              </span>

              <RunCell className="hidden w-[4rem] sm:block">
                {formatNumber(run.tiktokClicks)}
              </RunCell>
              <RunCell className="hidden w-[4rem] sm:block">
                {formatNumber(run.networkClicks)}
              </RunCell>
              <RunCell className="hidden w-[4rem] lg:block">
                {formatPercent(run.metrics.dropoffPct)}
              </RunCell>
              <RunCell className="hidden w-[4.5rem] lg:block">
                {formatCurrency(run.metrics.networkCpa)}
              </RunCell>
              <RunCell className="hidden w-[4.5rem] lg:block">
                {formatCurrency(run.metrics.epc)}
              </RunCell>

              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  run.status === "paused" ? "bg-secondary" : "bg-profit"
                )}
              />
              <span className="sr-only">
                {run.status === "paused" ? "Paused" : "Active"}
              </span>

              {/* Always visible on touch — a phone has no hover, so hiding
                  these behind one would make them unreachable. Revealed on
                  hover or keyboard focus from md up. */}
              <span className="ml-auto flex shrink-0 items-center gap-4 transition-opacity focus-within:opacity-100 md:gap-3 md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(run.id);
                    setAdding(false);
                  }}
                  className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline md:min-h-0"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => submit(() => deleteRun(run.id))}
                  className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-loss hover:underline disabled:opacity-40 md:min-h-0"
                >
                  Delete
                </button>
              </span>
            </div>
          )
        )
      )}

      {adding && (
        <RunForm
          key="new"
          pending={pending}
          onCancel={() => setAdding(false)}
          onSubmit={(formData) =>
            submit(
              () => createRun(campaignId, formData),
              () => setAdding(false)
            )
          }
        />
      )}

      <div className="flex items-center gap-4 py-2">
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setEditing(null);
          }}
          className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline md:min-h-0"
        >
          {adding ? "Cancel" : "Add run"}
        </button>
        {error && (
          <span role="alert" className="text-2xs text-loss">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

function RunCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tnum w-[5rem] shrink-0 text-right text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add / edit form                                                           */
/* -------------------------------------------------------------------------- */

function RunForm({
  run,
  pending,
  onSubmit,
  onCancel,
}: {
  run?: RunView;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-2 py-2 pr-3">
      <Field label="Date">
        <input
          type="date"
          name="run_date"
          required
          defaultValue={run?.runDate ?? new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </Field>
      <Field label="Spend">
        <input
          type="number"
          name="ad_spend"
          step="0.01"
          min="0"
          defaultValue={run?.adSpend ?? 0}
          className={inputClass}
        />
      </Field>
      <Field label="Revenue">
        <input
          type="number"
          name="revenue"
          step="0.01"
          min="0"
          defaultValue={run?.revenue ?? 0}
          className={inputClass}
        />
      </Field>
      <Field label="TT clicks">
        <input
          type="number"
          name="tiktok_clicks"
          step="1"
          min="0"
          defaultValue={run?.tiktokClicks ?? 0}
          className={inputClass}
        />
      </Field>
      <Field label="Net clicks">
        <input
          type="number"
          name="network_clicks"
          step="1"
          min="0"
          defaultValue={run?.networkClicks ?? 0}
          className={inputClass}
        />
      </Field>
      <Field label="Status">
        <select
          name="status"
          defaultValue={run?.status ?? "active"}
          className={inputClass}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
      </Field>

      <div className="flex items-center gap-3 pb-0.5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center border border-foreground px-3 text-2xs text-foreground transition-opacity hover:opacity-70 disabled:opacity-40 md:min-h-0 md:px-2 md:py-1"
        >
          {run ? "Save" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline md:min-h-0"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 w-[6.5rem] border border-border bg-background px-1.5 text-xs text-foreground outline-none focus:border-foreground md:h-7";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs uppercase tracking-header text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
