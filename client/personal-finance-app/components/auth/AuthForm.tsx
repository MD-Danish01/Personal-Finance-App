"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted-bg" />}>
      <AuthFormInner />
    </Suspense>
  );
}

function AuthFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const verifiedParam = searchParams.get("verified");
  const errorParam = searchParams.get("error");

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // States
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(
    errorParam === "InvalidOrExpiredToken"
      ? "Verification link is invalid or has expired. Please request a new link."
      : errorParam === "TokenExpired"
      ? "Verification link has expired. Please request a new link."
      : errorParam === "InvalidVerificationLink"
      ? "Invalid verification link."
      : errorParam === "VerificationFailed"
      ? "Email verification failed. Please try again."
      : errorParam === "OAuthAccountNotLinked"
      ? "An account with this email address already exists. You can sign in with your email and password, or continue with Google."
      : errorParam === "OAuthCallbackError"
      ? "Google sign-in was cancelled or failed. Please try again."
      : errorParam === "CredentialsSignin"
      ? "Invalid email or password. Please check your credentials."
      : null,
  );
  const [success, setSuccess] = useState<string | null>(
    verifiedParam === "true"
      ? "Email verified successfully! You can now sign in with your password."
      : null,
  );

  const handleResend = async (targetEmail: string) => {
    if (!targetEmail) return;
    setResending(true);
    setResendStatus(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification email.");
      }
      setResendStatus("A new verification link has been sent to your email!");
    } catch (err: unknown) {
      setResendStatus(err instanceof Error ? err.message : "Failed to resend.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUnverifiedEmail(null);
    setResendStatus(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
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
        // 1. Sign Up API (Creates user, generates token, sends email)
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create account.");
        }

        // 2. Transition to "Check Your Inbox" screen (DO NOT sign in yet)
        setIsAwaitingVerification(true);
      } else {
        // Sign In Flow
        const signInRes = await signIn("credentials", {
          email: cleanEmail,
          password,
          redirect: false,
          callbackUrl: "/home",
        });

        if (signInRes?.error) {
          const errString = String(signInRes.error);
          const errCode = String(signInRes.code || "");

          if (
            errCode === "EMAIL_NOT_VERIFIED" ||
            errString === "EMAIL_NOT_VERIFIED" ||
            errString.includes("EMAIL_NOT_VERIFIED")
          ) {
            setUnverifiedEmail(cleanEmail);
            setError(
              "Your email is not verified yet. Please click the link sent to your inbox before signing in.",
            );
          } else {
            setError("Invalid email or password. Please check your credentials.");
          }
        } else {
          router.push("/home");
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("EMAIL_NOT_VERIFIED")) {
        setUnverifiedEmail(cleanEmail);
        setError(
          "Your email is not verified yet. Please click the link sent to your inbox before signing in.",
        );
      } else if (errMsg.includes("CredentialsSignin") || errMsg.includes("INVALID_CREDENTIALS")) {
        setError("Invalid email or password. Please check your credentials.");
      } else {
        setError(errMsg || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/home", redirectTo: "/home" });
  };

  // View: Awaiting Verification Screen after Sign Up
  if (isAwaitingVerification) {
    return (
      <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-3xl shadow-xs">
          ✉️
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-foreground">Verify your email</h2>
          <p className="text-xs text-muted leading-relaxed max-w-xs mx-auto">
            We sent a verification link to{" "}
            <span className="font-bold text-foreground font-mono">{email}</span>.
            Please click the link in your inbox to activate your account.
          </p>
        </div>

        {resendStatus && (
          <div className="p-3 rounded-xl bg-primary-soft border border-primary-soft-border text-primary text-xs font-semibold">
            {resendStatus}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleResend(email)}
            disabled={resending}
            className="w-full py-2.5 rounded-xl border border-card-border bg-muted-bg text-xs font-semibold text-foreground hover:bg-card-border/40 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {resending ? "Sending New Link..." : "Resend Verification Email"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAwaitingVerification(false);
              setTab("signin");
              setError(null);
              setSuccess("Once verified in your email, sign in below.");
            }}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Proceed to Sign In
          </button>
        </div>
      </div>
    );
  }

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
            setUnverifiedEmail(null);
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
            setUnverifiedEmail(null);
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

      {/* Verification / Success alerts */}
      {success && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
          {success}
        </div>
      )}

      {/* Error & Unverified alert */}
      {error && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium space-y-2 animate-in fade-in">
          <p>{error}</p>
          {unverifiedEmail && (
            <button
              type="button"
              onClick={() => handleResend(unverifiedEmail)}
              disabled={resending}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              {resending ? "Sending..." : "Click here to resend verification email"}
            </button>
          )}
        </div>
      )}

      {resendStatus && (
        <div className="p-2.5 rounded-xl bg-primary-soft border border-primary-soft-border text-primary text-xs font-semibold animate-in fade-in">
          {resendStatus}
        </div>
      )}

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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
        >
          {loading
            ? tab === "signup"
              ? "Sending Verification Link..."
              : "Signing In..."
            : tab === "signup"
            ? "Create Account & Verify"
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
