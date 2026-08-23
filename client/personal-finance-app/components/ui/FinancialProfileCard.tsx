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

export function FinancialProfileCard() {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [income, setIncome] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<FinancialProfile | null>("/financial-profile")
      .then(({ data }) => {
        setProfile(data);
        if (data?.monthlyIncome) {
          setIncome(String(data.monthlyIncome / 100));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountPaise = Math.round(parseFloat(income) * 100);
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
      setMessage("Income saved! Plan auto-generated.");
    } catch {
      setMessage("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Monthly income</span>
        <span className="text-sm font-bold">
          {profile?.monthlyIncome ? formatINR(profile.monthlyIncome) : "—"}
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

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            ₹
          </span>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="Monthly income (INR)"
            className="w-full rounded-lg border border-border bg-white py-2 pl-7 pr-3 text-sm outline-none focus:border-brand-blue"
            min="1"
            step="1"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      {message && (
        <p className="text-xs text-muted">{message}</p>
      )}
    </div>
  );
}
