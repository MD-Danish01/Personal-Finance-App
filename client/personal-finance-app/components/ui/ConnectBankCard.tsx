"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";

interface ConnectResult {
  consentId: string;
  consentUrl: string;
  status: string;
}

interface ConnectBankCardProps {
  onConnected?: () => void;
}

export function ConnectBankCard({ onConnected }: ConnectBankCardProps) {
  const [open, setOpen] = useState(false);
  const [vua, setVua] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();

    if (!vua || vua.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post<ConnectResult>("/setu/connect", {
        vua: vua.trim(),
      });

      if (data.consentUrl) {
        onConnected?.();
        window.location.href = data.consentUrl;
      } else {
        setError("No consent URL received from Setu gateway");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Failed to connect. Check Setu credentials.";
      setError(msg ?? "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <section className="rounded-2xl border border-dashed border-primary/30 bg-primary-soft/40 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-xs">
            <Icon name="building" size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground">Connect Bank Account</div>
            <div className="text-xs text-muted truncate">
              Sync real transactions via RBI-licensed Account Aggregator
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Connect
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 transition-colors">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary shadow-xs">
          <Icon name="building" size={16} />
        </span>
        <h3 className="text-sm font-bold text-foreground">Connect via Setu AA</h3>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Bank-Registered Mobile Number
          </label>
          <input
            type="tel"
            maxLength={10}
            value={vua}
            onChange={(e) => setVua(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 9876543210"
            className="w-full rounded-xl border border-card-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted/60 font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
          >
            {loading ? "Redirecting to Setu..." : "Proceed to Consent"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl bg-card px-4 py-2.5 text-xs font-semibold text-muted border border-card-border hover:bg-muted-bg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>

      <p className="mt-2.5 text-[11px] text-muted leading-relaxed">
        You will be redirected to the secure Setu gateway to select your bank (HDFC, SBI, ICICI, etc.) and approve data sharing.
      </p>
    </section>
  );
}
