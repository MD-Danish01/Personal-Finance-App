"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";

type Step = "idle" | "sending" | "otp" | "verifying-otp" | "new-password" | "saving" | "done";

interface ChangePasswordModalProps {
  userEmail: string;
  onClose: () => void;
}

export function ChangePasswordModal({ userEmail, onClose }: ChangePasswordModalProps) {
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState(""); // store verified OTP to use in step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send OTP ──
  const handleSendOtp = async () => {
    setErrorMsg(null);
    setStep("sending");
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to send code. Please try again.");
        setStep("idle");
        return;
      }
      setStep("otp");
      startCooldown();
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStep("idle");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    setOtp("");
    await handleSendOtp();
  };

  // ── Step 2: Verify OTP only ──
  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    if (otp.trim().length !== 6) {
      setErrorMsg("Please enter the full 6-digit code.");
      return;
    }
    setStep("verifying-otp");
    try {
      const res = await fetch("/api/auth/change-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Incorrect code. Please try again.");
        setStep("otp");
        return;
      }
      // OTP verified — move to password step
      setVerifiedOtp(otp.trim());
      setStep("new-password");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStep("otp");
    }
  };

  // ── Step 3: Set new password ──
  const handleChangePassword = async () => {
    setErrorMsg(null);
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setStep("saving");
    try {
      const res = await fetch("/api/auth/change-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: verifiedOtp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to change password. Please try again.");
        setStep("new-password");
        return;
      }
      setStep("done");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStep("new-password");
    }
  };

  // Step indicator labels
  const stepLabels = ["Send Code", "Verify OTP", "New Password"];
  const currentStepIndex =
    step === "idle" || step === "sending" ? 0
    : step === "otp" || step === "verifying-otp" ? 1
    : step === "new-password" || step === "saving" ? 2
    : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-card border border-card-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="shield" size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Change Password</h2>
              <p className="text-[10px] text-muted">Secured by email OTP</p>
            </div>
          </div>
          {step !== "verifying-otp" && step !== "saving" && step !== "done" && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted-bg text-muted transition-colors cursor-pointer"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        {/* Step progress bar (hidden on done) */}
        {step !== "done" && (
          <div className="flex items-center gap-0 px-5 py-3 border-b border-card-border bg-muted-bg/40">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                    i < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === currentStepIndex
                      ? "bg-primary/20 border-2 border-primary text-primary"
                      : "bg-muted-bg border border-card-border text-muted"
                  }`}>
                    {i < currentStepIndex ? <Icon name="check" size={11} /> : i + 1}
                  </div>
                  <span className={`text-[9px] font-semibold ${i <= currentStepIndex ? "text-primary" : "text-muted"}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-3.5 mx-1 rounded-full transition-all ${i < currentStepIndex ? "bg-primary" : "bg-card-border"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4">

          {/* ── STEP 1: Explain & send OTP ── */}
          {(step === "idle" || step === "sending") && (
            <>
              <div className="rounded-2xl bg-muted-bg border border-card-border p-4 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">How it works</p>
                <p className="text-xs text-muted leading-relaxed">
                  A <strong className="text-foreground">6-digit verification code</strong> will be sent to your registered email:
                </p>
                <p className="text-xs font-mono font-bold text-primary">{userEmail}</p>
                <p className="text-xs text-muted leading-relaxed">
                  You must verify the code first, then set your new password.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500">
                  <Icon name="alert-triangle" size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleSendOtp}
                disabled={step === "sending"}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {step === "sending" ? (
                  <>
                    <Icon name="refresh-cw" size={16} className="animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} />
                    Send verification code
                  </>
                )}
              </button>
            </>
          )}

          {/* ── STEP 2: Enter & verify OTP ── */}
          {(step === "otp" || step === "verifying-otp") && (
            <>
              <div className="flex items-start gap-2 rounded-2xl bg-primary/10 border border-primary/20 p-3 text-xs text-primary">
                <Icon name="check-circle" size={14} className="shrink-0 mt-0.5" />
                <span>Code sent to <strong>{userEmail}</strong> — check your inbox.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setErrorMsg(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && otp.length === 6 && step !== "verifying-otp") handleVerifyOtp(); }}
                  placeholder="— — — — — —"
                  disabled={step === "verifying-otp"}
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-muted-bg border border-card-border text-center text-2xl font-bold font-mono tracking-[0.5em] text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/30 placeholder:text-lg placeholder:tracking-[0.3em] disabled:opacity-60"
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || step === "verifying-otp"}
                    className="text-[11px] text-primary font-semibold disabled:opacity-50 cursor-pointer hover:underline"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500">
                  <Icon name="alert-triangle" size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={step === "verifying-otp"}
                  className="flex-1 py-3 rounded-2xl bg-muted-bg border border-card-border text-xs font-bold text-muted hover:bg-card transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={step === "verifying-otp" || otp.length !== 6}
                  className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {step === "verifying-otp" ? (
                    <>
                      <Icon name="refresh-cw" size={14} className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" size={14} />
                      Verify code
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Set new password (only after OTP verified) ── */}
          {(step === "new-password" || step === "saving") && (
            <>
              <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <Icon name="check-circle" size={14} className="shrink-0 mt-0.5" />
                <span>Identity verified! Now set your new password.</span>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setErrorMsg(null); }}
                    placeholder="Min. 6 characters"
                    disabled={step === "saving"}
                    autoFocus
                    className="w-full px-4 py-3 pr-11 rounded-2xl bg-muted-bg border border-card-border text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/50 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                    tabIndex={-1}
                  >
                    <Icon name={showNew ? "check" : "search"} size={16} />
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(null); }}
                    placeholder="Re-enter new password"
                    disabled={step === "saving"}
                    className="w-full px-4 py-3 pr-11 rounded-2xl bg-muted-bg border border-card-border text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/50 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                    tabIndex={-1}
                  >
                    <Icon name={showConfirm ? "check" : "search"} size={16} />
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500">
                  <Icon name="alert-triangle" size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={step === "saving"}
                  className="flex-1 py-3 rounded-2xl bg-muted-bg border border-card-border text-xs font-bold text-muted hover:bg-card transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={step === "saving"}
                  className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {step === "saving" ? (
                    <>
                      <Icon name="refresh-cw" size={14} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Icon name="shield" size={14} />
                      Change password
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="text-center py-4 space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10">
                <Icon name="check-circle" size={32} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Password changed!</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Your password has been updated successfully. For security, please sign in again.
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all cursor-pointer"
              >
                Sign out &amp; sign in again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
