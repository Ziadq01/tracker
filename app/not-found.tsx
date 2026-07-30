import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-muted-foreground">
        404
      </p>
      <h1 className="text-lg font-semibold">No such page</h1>
      <p className="max-w-sm text-xs text-muted-foreground">
        That route isn&apos;t part of ADRIX.
      </p>
      <Button asChild size="sm">
        <Link href="/">Back to the War Room</Link>
      </Button>
    </div>
  );
}
