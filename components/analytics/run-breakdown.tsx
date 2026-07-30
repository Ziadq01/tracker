"use client";

import * as React from "react";

import { createRun, deleteRun, updateRun } from "@/lib/actions";
import type { RunView } from "@/lib/campaign-ui";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/metrics";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

/**
 * Inline run breakdown for one campaign. Indented with a gray left border so it
 * reads as subordinate to its parent row.
 */
export function RunBreakdown({
  campaignId,
  campaignName,
  runs,
}: {
  campaignId: string;
  campaignName: string;
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
      className="ml-6 border-l border-border bg-hover/40 pl-4"
      onClick={(event) => event.stopPropagation()}
      role="presentation"
    >
      <div className="flex items-center justify-between gap-4 py-2 pr-3">
        <span className="text-2xs uppercase tracking-header text-secondary">
          {runs.length} {runs.length === 1 ? "run" : "runs"} · {campaignName}
        </span>
        <div className="flex items-center gap-3">
          {error && (
            <span role="alert" className="text-2xs text-loss">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setEditing(null);
            }}
            className="text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {adding ? "Cancel" : "Add run"}
          </button>
        </div>
      </div>

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

      {runs.length === 0 && !adding ? (
        <p className="py-3 text-2xs text-secondary">
          No runs in this window.
        </p>
      ) : (
        <div>
          {runs.map((run) =>
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
                className="flex items-center gap-3 border-t border-border py-2 pr-3 text-xs"
              >
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

                <span className="tnum w-[4rem] shrink-0 whitespace-nowrap text-foreground">
                  {run.runDateLabel}
                </span>

                <span className="tnum w-[5rem] shrink-0 text-right text-foreground">
                  {formatCurrency(run.adSpend)}
                </span>
                <span className="tnum w-[5rem] shrink-0 text-right text-foreground">
                  {formatCurrency(run.revenue)}
                </span>
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

                <span className="tnum hidden w-[4rem] shrink-0 text-right text-foreground sm:inline">
                  {formatNumber(run.tiktokClicks)}
                </span>
                <span className="tnum hidden w-[4rem] shrink-0 text-right text-foreground sm:inline">
                  {formatNumber(run.networkClicks)}
                </span>
                <span className="tnum hidden w-[3.5rem] shrink-0 text-right text-foreground lg:inline">
                  {formatPercent(run.metrics.dropoffPct)}
                </span>
                <span className="tnum hidden w-[4rem] shrink-0 text-right text-foreground lg:inline">
                  {formatCurrency(run.metrics.networkCpa, { decimals: 3 })}
                </span>
                <span className="tnum hidden w-[4rem] shrink-0 text-right text-foreground lg:inline">
                  {formatCurrency(run.metrics.epc, { decimals: 3 })}
                </span>

                <span className="ml-auto flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(run.id);
                      setAdding(false);
                    }}
                    className="text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => submit(() => deleteRun(run.id))}
                    className="text-2xs text-secondary underline-offset-4 transition-colors hover:text-loss hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
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
    <form
      action={onSubmit}
      className="flex flex-wrap items-end gap-2 border-t border-border py-2 pr-3"
    >
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
          className="border border-foreground px-2 py-1 text-2xs text-foreground transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          {run ? "Save" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "h-7 w-[6.5rem] border border-border bg-background px-1.5 text-xs text-foreground outline-none focus:border-foreground";

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
