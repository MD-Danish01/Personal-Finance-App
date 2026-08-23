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
    apiClient
      .get<FinancialProfile | null>("/financial-profile")
      .then(({ data }) => {
        setProfile(data);
        if (data?.monthlyIncome) {
          setIncome(formatIncomeDisplay(data.monthlyIncome));
        }
      })
      .catch(() => {});
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
      setMessage("Income saved!");
    } catch {
      setMessage("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Monthly income</span>
          <span className="text-sm font-bold">
            {profile?.monthlyIncome
              ? formatINR(profile.monthlyIncome / 100)
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Essentials</span>
          <span className="text-sm font-semibold text-brand-green">
            {profile ? `${profile.essentialsPercent}%` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Savings</span>
          <span className="text-sm font-semibold text-brand-purple">
            {profile ? `${profile.savingsPercent}%` : "—"}
          </span>
        </div>
        <button
          onClick={() => {
            setEditing(true);
            setMessage(null);
          }}
          className="mt-2 w-full rounded-lg border border-border bg-white py-2 text-sm font-medium text-brand-blue hover:bg-muted/30 transition-colors"
        >
          {profile ? "Edit income" : "Set monthly income"}
        </button>
        {message && <p className="text-xs text-muted">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted">
            Monthly income (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
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
              placeholder="e.g. 30,000"
              className="w-full rounded-lg border border-border bg-white py-2 pl-7 pr-3 text-sm outline-none focus:border-brand-blue"
              autoFocus
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Enter your income in rupees (e.g. 30,000 for ₹30,000/month)
          </p>
        </div>

        {message && <p className="text-xs text-red-600">{message}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setIncome(formatIncomeDisplay(profile?.monthlyIncome ?? 0));
              setMessage(null);
            }}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-muted border border-border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
