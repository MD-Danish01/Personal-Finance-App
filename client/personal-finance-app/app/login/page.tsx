"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("magic");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const supabase = createClient();

    const result =
      mode === "magic"
        ? await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "magic") {
      setMessage("Check your email for the secure sign-in link.");
      return;
    }

    const next =
      new URLSearchParams(window.location.search).get("next") || "/home";
    router.push(next);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-8">
          <div className="mb-3 text-sm font-semibold text-brand-green">
            Personal Finance
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to continue planning your money.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border px-3 py-3 outline-none focus:border-brand-green"
              placeholder="you@example.com"
            />
          </label>

          {mode === "password" && (
            <label className="block text-sm font-medium">
              Password
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border px-3 py-3 outline-none focus:border-brand-green"
                placeholder="Your password"
              />
            </label>
          )}

          {error && <p className="text-sm text-brand-red">{error}</p>}
          {message && <p className="text-sm text-brand-green">{message}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-brand-green px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "magic"
                ? "Email me a sign-in link"
                : "Sign in"}
          </button>
        </form>

        <button
          onClick={() =>
            setMode(mode === "magic" ? "password" : "magic")
          }
          className="mt-4 w-full text-center text-sm font-medium text-brand-blue"
        >
          {mode === "magic" ? "Use password instead" : "Use magic link instead"}
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-brand-blue">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}