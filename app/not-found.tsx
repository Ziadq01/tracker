import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-2xs uppercase tracking-header text-secondary">404</p>
      <h1 className="text-sm font-bold text-foreground">No such page</h1>
      <p className="max-w-sm text-xs text-secondary">
        That route isn&apos;t part of ADRIX.
      </p>
      <Link
        href="/analytics"
        className="text-xs text-foreground underline underline-offset-4"
      >
        Back to Analytics
      </Link>
    </div>
  );
}
