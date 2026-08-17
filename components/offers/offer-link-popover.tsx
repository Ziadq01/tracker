"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const LINK_BASE = "https://linkthem.net/aff_c";
const AFF_ID = "2953";

export function OfferLinkPopover({
  offerId,
  offerName,
}: {
  offerId: number;
  offerName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [source, setSource] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const link = React.useMemo(() => {
    const params = new URLSearchParams({
      offer_id: String(offerId),
      aff_id: AFF_ID,
    });
    const s = source.trim();
    if (s) params.set("source", s);
    return `${LINK_BASE}?${params.toString()}`;
  }, [offerId, source]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the link is still selectable below.
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCopied(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Generate tracking link"
          className="block max-w-full truncate text-left text-xs font-bold text-foreground underline-offset-4 transition-colors hover:underline md:text-[13px]"
        >
          {offerName}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={28}
        className="w-[min(20rem,calc(100vw-2rem))]"
      >
        <p className="text-2xs uppercase tracking-header text-secondary">
          Tracking link
        </p>

        <label className="mt-3 block">
          <span className="text-2xs text-secondary">Source tag (optional)</span>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. UK1"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-nav-muted focus:border-foreground"
          />
        </label>

        <div className="mt-3 break-all rounded border border-border bg-hover px-2 py-1.5 font-mono text-2xs text-foreground">
          {link}
        </div>

        <Button
          variant="solid"
          size="xs"
          onClick={copy}
          className={cn(
            "mt-3 w-full min-h-[36px]",
            copied && "opacity-80"
          )}
        >
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
