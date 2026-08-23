"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";

interface ConnectResult {
  consentId: string;
  consentUrl: string;
  status: string;
}

export function ConnectBankCard() {
  const [open, setOpen] = useState(false);
  const [vua, setVua] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();

    if (!vua) {
      setError("Enter your mobile number (e.g. 9999999999)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post<ConnectResult>("/setu/connect", {
        vua,
      });

      if (data.consentUrl) {
        window.location.href = data.consentUrl;
      } else {
        setError("No consent URL received from Setu");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Failed to connect. Check your Setu credentials.";
      setError(msg ?? "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <section className="mt-4 rounded-2xl border border-dashed border-brand-blue/30 bg-brand-blue-soft/50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-blue">
            <Icon name="money" size={18} />
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold">Connect your bank</div>
            <div className="mt-0.5 text-xs text-muted">
              Sync transactions via Account Aggregator (Setu).
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-brand-blue px-3 py-1 text-[10px] font-semibold text-white"
          >
            Connect
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-brand-blue/30 bg-brand-blue-soft/50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-blue">
          <Icon name="money" size={18} />
        </span>
        <h3 className="text-sm font-semibold">Connect via Account Aggregator</h3>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted">
            Mobile Number
          </label>
          <input
            type="text"
            value={vua}
            onChange={(e) => setVua(e.target.value)}
            placeholder="9999999999"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating consent..." : "Connect Bank"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-muted border border-border"
          >
            Cancel
          </button>
        </div>
      </form>

      <p className="mt-2 text-[11px] text-muted">
        You will be redirected to Setu&apos;s consent screen to approve data sharing.
      </p>
    </section>
  );
}
