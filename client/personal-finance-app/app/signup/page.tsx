"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Account created! Check your email for a confirmation link.",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-8">
          <div className="mb-3 text-sm font-semibold text-brand-green">
            Personal Finance
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted">
            Start planning your money with confidence.
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

          <label className="block text-sm font-medium">
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border px-3 py-3 outline-none focus:border-brand-green"
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="text-sm text-brand-red">{error}</p>}
          {message && <p className="text-sm text-brand-green">{message}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-brand-green px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-blue">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}