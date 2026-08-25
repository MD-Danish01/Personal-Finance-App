"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ConnectBankCard } from "@/components/ui/ConnectBankCard";

interface ConnectedAccount {
  id: string;
  fipId: string;
  fipName: string;
  maskedAccountNumber: string | null;
  accountType: string;
  linkedAt: string;
}

interface ConsentData {
  consentId: string;
  status: string;
  consentExpiry: string | null;
  createdAt: string;
}

export function ConnectedAccountsCard() {
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [revoking, setRevoking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const res = await fetch("/api/setu/consent");
        if (res.ok && !ignore) {
          const data = await res.json();
          setConsent(data.consent);
          setAccounts(data.accounts || []);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const handleSync = async () => {
    if (!consent?.consentId) return;

    try {
      setSyncing(true);
      const res = await fetch("/api/setu/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", consentId: consent.consentId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setConsent((prev) => (prev ? { ...prev, status: data.status } : null));
        }
        if (data.accounts) {
          setAccounts(data.accounts);
        }
      }
    } catch {
      // Ignore sync error
    } finally {
      setSyncing(false);
      setRefreshTrigger((p) => p + 1);
    }
  };

  const handleRevoke = async () => {
    if (!consent?.consentId) return;
    if (
      !confirm(
        "Are you sure you want to disconnect your bank account? This will revoke live Account Aggregator sync.",
      )
    ) {
      return;
    }

    try {
      setRevoking(true);
      const res = await fetch("/api/setu/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", consentId: consent.consentId }),
      });

      if (res.ok) {
        setConsent(null);
        setAccounts([]);
      }
    } catch {
      alert("Failed to disconnect account. Please try again.");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[140px]">
        <div className="flex items-center gap-2.5 text-xs text-muted">
          <Icon name="refresh-cw" size={16} className="animate-spin text-primary" />
          <span>Checking linked bank status...</span>
        </div>
      </Card>
    );
  }

  // If no consent or consent is REVOKED/REJECTED/EXPIRED, show ConnectBankCard
  if (!consent || consent.status === "REVOKED" || consent.status === "REJECTED") {
    return <ConnectBankCard onConnected={() => setRefreshTrigger((p) => p + 1)} />;
  }

  const isApproved =
    consent.status === "APPROVED" || consent.status === "ACTIVE";

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name="building" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Linked Bank Accounts</h3>
            <p className="text-[11px] text-muted">Powered by Setu Account Aggregator</p>
          </div>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            isApproved
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          }`}
        >
          {isApproved ? "ACTIVE" : consent.status}
        </span>
      </div>

      {/* Account list */}
      {accounts.length > 0 ? (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between p-3 rounded-xl bg-muted-bg border border-card-border"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-foreground font-bold text-xs shadow-xs">
                  {acc.fipName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{acc.fipName}</p>
                  <p className="text-[11px] text-muted font-mono">
                    {acc.maskedAccountNumber || "XXXX-Deposit"} • {acc.accountType}
                  </p>
                </div>
              </div>
              <Icon name="check-circle" size={16} className="text-emerald-500" />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-muted-bg text-center space-y-2.5 border border-card-border">
          <p className="text-xs text-muted">
            {isApproved
              ? "Consent approved! Click below to sync and pull your bank statements."
              : "Consent is pending verification. If you approved it on Setu, click 'Sync Now' to refresh."}
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Icon
              name="refresh-cw"
              size={13}
              className={syncing ? "animate-spin" : ""}
            />
            <span>{syncing ? "Syncing with Setu..." : "Sync Now"}</span>
          </button>
        </div>
      )}

      {/* Action footer */}
      <div className="flex items-center justify-between pt-1 border-t border-card-border text-xs">
        <span className="text-[11px] text-muted">
          Consent ID: <span className="font-mono">{consent.consentId.slice(0, 8)}...</span>
        </span>
        <div className="flex items-center gap-3">
          {isApproved && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Data"}
            </button>
          )}
          <button
            type="button"
            onClick={handleRevoke}
            disabled={revoking}
            className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 dark:text-red-400 cursor-pointer disabled:opacity-50"
          >
            <Icon name="trash-2" size={13} />
            {revoking ? "Revoking..." : "Disconnect"}
          </button>
        </div>
      </div>
    </Card>
  );
}
