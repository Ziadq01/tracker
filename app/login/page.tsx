"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginInner />
    </React.Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || password.length === 0) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Invalid password");
        setPassword("");
        inputRef.current?.focus();
        return;
      }

      const next = searchParams.get("next");
      // Only same-origin paths, so a crafted ?next cannot bounce elsewhere.
      const target = next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/analytics";

      // Replace so Back does not return to the login form.
      router.replace(target);
      router.refresh();
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setPending(false);
    }
  };

  return (
    // Fixed and above the app shell: the root layout renders the sidebar on
    // every route, and it should not be visible behind the gate.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "#181818" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[22rem] rounded-xl border border-border bg-background p-6"
      >
        <h1 className="text-sm font-bold text-foreground">Scaler</h1>
        <p className="mt-1 text-2xs text-secondary">
          Enter your password to continue
        </p>

        <div className="relative mt-5">
          <input
            ref={inputRef}
            type={reveal ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Password"
            autoComplete="current-password"
            aria-label="Password"
            aria-invalid={error ? true : undefined}
            className="w-full rounded border border-border bg-background py-2.5 pl-3 pr-16 text-xs text-foreground outline-none transition-colors placeholder:text-nav-muted focus:border-foreground"
          />
          <button
            type="button"
            onClick={() => {
              setReveal((v) => !v);
              inputRef.current?.focus();
            }}
            tabIndex={-1}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-2xs uppercase tracking-header text-secondary transition-colors hover:text-foreground"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-2xs text-loss">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || password.length === 0}
          className="mt-5 w-full rounded bg-foreground py-2.5 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
