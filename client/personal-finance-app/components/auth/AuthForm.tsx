"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (tab === "signup") {
        // 1. Call Register API
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create account.");
        }

        setSuccess("Account created! Signing you in...");

        // 2. Automatically sign in with credentials
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInRes?.error) {
          setTab("signin");
          setSuccess("Account created successfully! Please sign in.");
        } else {
          router.push("/home");
          router.refresh();
        }
      } else {
        // Sign In Flow
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInRes?.error) {
          setError("Invalid email or password. Please try again.");
        } else {
          router.push("/home");
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/home" });
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="grid grid-cols-2 rounded-2xl bg-muted-bg p-1 border border-card-border">
        <button
          type="button"
          onClick={() => {
            setTab("signin");
            setError(null);
            setSuccess(null);
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === "signin"
              ? "bg-card text-foreground shadow-xs border border-card-border"
              : "text-muted hover:text-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("signup");
            setError(null);
            setSuccess(null);
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === "signup"
              ? "bg-card text-foreground shadow-xs border border-card-border"
              : "text-muted hover:text-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {tab === "signup" && (
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium transition-all"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-card-border bg-muted-bg pl-3.5 pr-10 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-foreground cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {tab === "signup" && (
            <p className="text-[10px] text-muted mt-1">Minimum 6 characters</p>
          )}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-in fade-in">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
        >
          {loading
            ? tab === "signup"
              ? "Creating Account..."
              : "Signing In..."
            : tab === "signup"
            ? "Create Account"
            : "Sign In"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-card-border" />
        <span className="bg-card px-3 text-[11px] font-semibold text-muted uppercase tracking-wider absolute">
          or
        </span>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-card-border bg-muted-bg px-4 py-3 text-xs font-bold text-foreground hover:bg-card-border/40 transition-all shadow-xs cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>
    </div>
  );
}
