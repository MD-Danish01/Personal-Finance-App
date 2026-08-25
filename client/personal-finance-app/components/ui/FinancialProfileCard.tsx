"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/client";
import { formatINR } from "@/lib/format";

interface FinancialProfile {
  id: string;
  monthlyIncome: number;
  currency: string;
  essentialsPercent: number;
  savingsPercent: number;
  enjoymentPercent: number;
  bufferPercent: number;
}

function formatIncomeDisplay(paise: number): string {
  if (!paise) return "";
  const rupees = Math.round(paise / 100);
  return rupees.toLocaleString("en-IN");
}

export function FinancialProfileCard() {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [income, setIncome] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    apiClient
      .get<FinancialProfile | null>("/financial-profile")
      .then(({ data }) => {
        if (!ignore) {
          setProfile(data);
          if (data?.monthlyIncome) {
            setIncome(formatIncomeDisplay(data.monthlyIncome));
          }
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanValue = income.replace(/,/g, "");
    const amountRupees = parseFloat(cleanValue);
    const amountPaise = Math.round(amountRupees * 100);
    if (!amountPaise || amountPaise <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { data } = await apiClient.put<FinancialProfile>(
        "/financial-profile",
        { monthlyIncome: amountPaise },
      );
      setProfile(data);
      setIncome(formatIncomeDisplay(data.monthlyIncome));
      setEditing(false);
      setMessage("Income saved successfully!");
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Failed to save income. Please try again.";
      setMessage(errorMsg ?? "Failed to save income. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Monthly Income</span>
          <span className="text-sm font-bold text-foreground font-mono">
            {profile?.monthlyIncome
              ? formatINR(profile.monthlyIncome / 100)
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Essentials Allocation</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {profile ? `${profile.essentialsPercent}%` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Savings & Goals Allocation</span>
          <span className="text-xs font-bold text-primary">
            {profile ? `${profile.savingsPercent}%` : "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setMessage(null);
          }}
          className="mt-2 w-full rounded-xl border border-card-border bg-muted-bg py-2.5 text-xs font-bold text-primary hover:bg-primary-soft transition-colors cursor-pointer"
        >
          {profile ? "Edit Income Baseline" : "Set Monthly Income"}
        </button>
        {message && <p className="text-xs text-muted text-center">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted uppercase tracking-wider">
            Monthly Income (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-muted">
              ₹
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={income}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setIncome(raw ? Number(raw).toLocaleString("en-IN") : "");
              }}
              placeholder="e.g. 50,000"
              className="w-full rounded-xl border border-card-border bg-muted-bg py-2.5 pl-8 pr-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              autoFocus
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Enter your monthly take-home salary or income in INR.
          </p>
        </div>

        {message && <p className="text-xs text-red-500 font-medium">{message}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
          >
            {saving ? "Saving..." : "Save Baseline"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setIncome(formatIncomeDisplay(profile?.monthlyIncome ?? 0));
              setMessage(null);
            }}
            className="rounded-xl bg-muted-bg px-4 py-2.5 text-xs font-semibold text-muted border border-card-border hover:bg-card-border/40 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
