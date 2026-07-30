"use server";

import { revalidatePath } from "next/cache";

import type { FlagStatus } from "@/lib/campaign-ui";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Writes for the campaign controls and the run breakdown.
 *
 * These are new mutations — no existing query or metric calculation is touched.
 * Every action returns a plain result object rather than throwing, so the
 * client can roll an optimistic update back and show what went wrong.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED: ActionResult = {
  ok: false,
  error: "Supabase isn't connected.",
};

function fail(message: string): ActionResult {
  return { ok: false, error: message };
}

/** Number parsing for form fields — blank means 0, garbage means an error. */
function parseNumber(value: FormDataEntryValue | null, label: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "") return { ok: true as const, value: 0 };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return { ok: false as const, error: `${label} must be a number.` };
  }
  if (parsed < 0) {
    return { ok: false as const, error: `${label} can't be negative.` };
  }
  return { ok: true as const, value: parsed };
}

/* -------------------------------------------------------------------------- */
/*  Campaign controls                                                         */
/* -------------------------------------------------------------------------- */

export async function setCampaignStatus(
  creativeId: string,
  status: "active" | "paused"
): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase
    .from("creatives")
    .update({ status })
    .eq("id", creativeId);

  if (error) return fail(error.message);
  revalidatePath("/analytics");
  return { ok: true };
}

export async function setCampaignStarred(
  creativeId: string,
  isStarred: boolean
): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase
    .from("creatives")
    .update({ is_starred: isStarred })
    .eq("id", creativeId);

  if (error) return fail(error.message);
  revalidatePath("/analytics");
  return { ok: true };
}

export async function setCampaignFlag(
  creativeId: string,
  flagStatus: FlagStatus
): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase
    .from("creatives")
    .update({ flag_status: flagStatus })
    .eq("id", creativeId);

  if (error) return fail(error.message);
  revalidatePath("/analytics");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Runs                                                                      */
/* -------------------------------------------------------------------------- */

type RunFields = {
  run_date: string;
  ad_spend: number;
  revenue: number;
  tiktok_clicks: number;
  network_clicks: number;
  status: "active" | "paused";
};

function readRunForm(
  formData: FormData
): { ok: true; value: RunFields } | { ok: false; error: string } {
  const runDate = String(formData.get("run_date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
    return { ok: false, error: "Pick a valid run date." };
  }

  const spend = parseNumber(formData.get("ad_spend"), "Spend");
  if (!spend.ok) return spend;
  const revenue = parseNumber(formData.get("revenue"), "Revenue");
  if (!revenue.ok) return revenue;
  const tiktok = parseNumber(formData.get("tiktok_clicks"), "TikTok clicks");
  if (!tiktok.ok) return tiktok;
  const network = parseNumber(formData.get("network_clicks"), "Network clicks");
  if (!network.ok) return network;

  const status = formData.get("status") === "paused" ? "paused" : "active";

  return {
    ok: true,
    value: {
      run_date: runDate,
      ad_spend: spend.value,
      revenue: revenue.value,
      tiktok_clicks: Math.round(tiktok.value),
      network_clicks: Math.round(network.value),
      status,
    },
  };
}

export async function createRun(
  creativeId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  const parsed = readRunForm(formData);
  if (!parsed.ok) return fail(parsed.error);

  const { error } = await supabase
    .from("runs")
    .insert({ creative_id: creativeId, ...parsed.value });

  if (error) return fail(error.message);
  revalidatePath("/analytics");
  return { ok: true };
}

export async function updateRun(
  runId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  const parsed = readRunForm(formData);
  if (!parsed.ok) return fail(parsed.error);

  const { error } = await supabase
    .from("runs")
    .update(parsed.value)
    .eq("id", runId);

  if (error) return fail(error.message);
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteRun(runId: string): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.from("runs").delete().eq("id", runId);

  if (error) return fail(error.message);
  revalidatePath("/analytics");
  return { ok: true };
}
