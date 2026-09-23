"use client";

/**
 * Transfer Page
 *
 * DEMO/SANDBOX path: simulates a transfer inside Spendly (no real money).
 * UPI REDIRECT path: builds a standard upi:// URI and hands off to the
 *   user's installed UPI app (Google Pay, PhonePe, BHIM, Paytm, etc.).
 *   Spendly never processes, holds, or verifies real payments.
 *   No UPI PIN, OTP, bank password, CVV, or card number is ever collected.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatINR } from "@/lib/format";
import type { Category } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Demo transfer steps
type TransferStep =
  | "home"
  | "form"
  | "review"
  | "processing"
  | "success"
  | "qr-scanner"
  // UPI-pay (separate flow) steps
  | "upi-pay-form"
  | "upi-pay-qr"
  | "upi-pay-return"

interface TransferFormData {
  recipientName: string;
  upiId: string;
  amount: string;
  note: string;
  category: Category;
}

interface CompletedTransfer {
  id: string;
  recipientName: string;
  upiId: string;
  amount: number;
  category: Category;
  note: string;
  timestamp: string; // ISO string — serialisable for localStorage
  transactionId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "Food", label: "Food", color: "text-amber-500 bg-amber-500/10" },
  { id: "Transport", label: "Transport", color: "text-blue-500 bg-blue-500/10" },
  { id: "Shopping", label: "Shopping", color: "text-purple-500 bg-purple-500/10" },
  { id: "Entertainment", label: "Fun", color: "text-rose-500 bg-rose-500/10" },
  { id: "Bills", label: "Bills", color: "text-emerald-500 bg-emerald-500/10" },
  { id: "Others", label: "Others", color: "text-slate-500 bg-slate-500/10" },
];

const CATEGORY_COLOR: Record<Category, string> = {
  Food: "text-amber-500 bg-amber-500/10",
  Transport: "text-blue-500 bg-blue-500/10",
  Shopping: "text-purple-500 bg-purple-500/10",
  Entertainment: "text-rose-500 bg-rose-500/10",
  Bills: "text-emerald-500 bg-emerald-500/10",
  Others: "text-slate-500 bg-slate-500/10",
};

const DEMO_DISCLAIMER = "Demo transaction — no real money will be transferred.";
const LS_KEY = "spendly:demo-transfers";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (pure functions, no hooks)
// ─────────────────────────────────────────────────────────────────────────────

function generateDemoTxId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "SP-DMO-";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function validateUpiId(id: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(id.trim());
}

function loadTransfers(): CompletedTransfer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CompletedTransfer[]) : [];
  } catch {
    return [];
  }
}

function saveTransfers(transfers: CompletedTransfer[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(transfers));
}
function parseUpiQR(raw: string): { recipientName: string; upiId: string } | null {
  try {
    let upiId = "";
    let recipientName = "";
    if (raw.startsWith("upi://")) {
      const url = new URL(raw);
      upiId = url.searchParams.get("pa") || "";
      // Only use pn if explicitly present; do NOT invent a name from the UPI ID
      const pn = url.searchParams.get("pn");
      recipientName = pn ? decodeURIComponent(pn) : "";
    } else if (raw.includes("@")) {
      upiId = raw.trim();
      recipientName = ""; // no name available from raw UPI ID string
    }
    if (upiId && validateUpiId(upiId)) {
      return { upiId, recipientName };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Build a standard UPI payment URI. Omits pn when name is blank. */
function buildUpiUri(upiId: string, amount: number, recipientName?: string, note?: string): string {
  const params = new URLSearchParams();
  params.set("pa", upiId);
  if (recipientName?.trim()) params.set("pn", recipientName.trim());
  params.set("am", amount.toFixed(2));
  params.set("cu", "INR");
  if (note?.trim()) params.set("tn", note.trim());
  return `upi://pay?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI helpers (no state)
// ─────────────────────────────────────────────────────────────────────────────

function DemoTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <Icon name="shield" size={10} />
      DEMO
    </span>
  );
}

function DisclaimerBanner({ text = DEMO_DISCLAIMER }: { text?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/6 px-3 py-2.5 text-[11px] text-amber-700 dark:text-amber-400">
      <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Generator (demo QR only)
// ─────────────────────────────────────────────────────────────────────────────

function DemoQRGenerator({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const demoPayload = "upi://pay?pa=demo-user@demo&pn=Spendly%20Demo";

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    import("qrcode")
      .then((QRCode) => {
        if (cancelled) return;
        return QRCode.toCanvas(canvas, demoPayload, {
          width: 200,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        className="w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl border border-card-border shadow-2xl p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-label="Demo QR Code"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">My Demo QR</h3>
            <p className="text-xs text-muted mt-0.5">For testing purposes only</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex justify-center">
          <div className="rounded-2xl border border-card-border bg-white p-3 shadow-sm">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl bg-muted-bg border border-card-border px-3 py-2 text-[11px] text-muted font-mono break-all">
            {demoPayload}
          </div>
          <DisclaimerBanner text="Demo QR — not connected to real UPI payments." />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Scanner
// ─────────────────────────────────────────────────────────────────────────────

type CameraState = "idle" | "active" | "denied" | "unavailable";

interface QRScannerProps {
  onScanned: (data: { recipientName: string; upiId: string }) => void;
  onClose: () => void;
}

function QRScanner({ onScanned, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [manualUpi, setManualUpi] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualError, setManualError] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Camera start is only triggered by user action (button) or the outer useEffect
  // which deliberately fires it via a Promise chain to avoid the set-state-in-effect rule.
  const initiateCamera = useCallback(
    (onSuccess: () => void, onDenied: () => void, onUnavailable: () => void) => {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          streamRef.current = stream;
          const video = videoRef.current;
          if (!video) return;

          // Assign the stream only once; avoid re-assigning if already set
          // (guards against React Strict Mode double-invoke and re-renders)
          if (video.srcObject !== stream) {
            video.srcObject = stream;
          }

          // Play only after the browser has loaded metadata —
          // calling play() before loadedmetadata triggers AbortError
          // "play() request was interrupted by a new load request"
          const startPlay = () => {
            video.play().catch((err: unknown) => {
              // Ignore AbortError — it means a subsequent load superseded this one
              if (err instanceof DOMException && err.name === "AbortError") return;
              console.error("video.play() error:", err);
            });
          };

          if (video.readyState >= video.HAVE_METADATA) {
            startPlay();
          } else {
            video.addEventListener("loadedmetadata", startPlay, { once: true });
          }

          onSuccess();

          const tick = (): void => {
            const v = videoRef.current;
            const c = canvasRef.current;
            if (!v || !c) return;
            if (v.readyState === v.HAVE_ENOUGH_DATA) {
              c.width = v.videoWidth;
              c.height = v.videoHeight;
              const ctx = c.getContext("2d");
              if (ctx) {
                ctx.drawImage(v, 0, 0, c.width, c.height);
                const imageData = ctx.getImageData(0, 0, c.width, c.height);
                import("jsqr")
                  .then((mod) => {
                    const jsQR = mod.default;
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) {
                      stopCamera();
                      setScanResult(code.data);
                      const parsed = parseUpiQR(code.data);
                      if (parsed) onScanned(parsed);
                      return;
                    }
                    animFrameRef.current = requestAnimationFrame(tick);
                  })
                  .catch(() => {
                    animFrameRef.current = requestAnimationFrame(tick);
                  });
                return;
              }
            }
            animFrameRef.current = requestAnimationFrame(tick);
          };

          animFrameRef.current = requestAnimationFrame(tick);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Permission") || msg.includes("NotAllowed")) {
            onDenied();
          } else {
            onUnavailable();
          }
        });
    },
    [onScanned, stopCamera],
  );

  useEffect(() => {
    initiateCamera(
      () => setCameraState("active"),
      () => setCameraState("denied"),
      () => setCameraState("unavailable"),
    );
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = useCallback(() => {
    setCameraState("idle");
    initiateCamera(
      () => setCameraState("active"),
      () => setCameraState("denied"),
      () => setCameraState("unavailable"),
    );
  }, [initiateCamera]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        import("jsqr")
          .then((mod) => {
            const jsQR = mod.default;
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            URL.revokeObjectURL(url);
            if (code) {
              setScanResult(code.data);
              const parsed = parseUpiQR(code.data);
              if (parsed) {
                onScanned(parsed);
              } else {
                setScanResult("QR decoded but no valid UPI data found.");
              }
            } else {
              setScanResult("Could not read QR from this image.");
            }
          })
          .catch(() => {
            URL.revokeObjectURL(url);
            setScanResult("Failed to process image.");
          });
      };
      img.src = url;
    },
    [onScanned],
  );

  const handleManualSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!manualUpi.trim()) { setManualError("Please enter a UPI ID."); return; }
      if (!validateUpiId(manualUpi)) { setManualError("Enter a valid UPI ID (e.g. name@upi)"); return; }
      onScanned({
        upiId: manualUpi.trim(),
        recipientName: manualName.trim(), // empty string is fine — name is optional
      });
    },
    [manualUpi, manualName, onScanned],
  );

  const showFallback = cameraState === "denied" || cameraState === "unavailable";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="QR Scanner">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-4 border-b border-card-border bg-card/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name="qr-code" size={16} />
          </div>
          <h2 className="text-base font-bold text-foreground">Scan QR</h2>
          <DemoTag />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted-bg text-muted cursor-pointer"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto overflow-y-auto p-4 space-y-4">
        {/* Camera view */}
        {!showFallback && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-black aspect-square w-full max-w-sm mx-auto">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Corner brackets overlay */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                <div className="absolute inset-x-4 h-0.5 bg-primary/70 top-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              {cameraState === "idle" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Icon name="refresh-cw" size={24} className="animate-spin" />
                    <p className="text-xs">Starting camera…</p>
                  </div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
            <p className="text-center text-xs text-muted">Point the camera at a UPI QR code</p>
          </div>
        )}

        {/* Scan result */}
        {scanResult && (
          <Card className="p-3">
            <p className="text-xs text-muted font-mono break-all">{scanResult}</p>
          </Card>
        )}

        {/* Fallback: camera denied or unavailable */}
        {showFallback && (
          <Card className="p-5 space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Icon name="alert-triangle" size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Camera access is unavailable</p>
              <p className="text-xs text-muted mt-1">
                {cameraState === "denied"
                  ? "Camera permission was denied. Allow access in browser settings and try again."
                  : "Your device or browser does not support camera access."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-soft text-primary px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              <Icon name="refresh-cw" size={13} />
              Retry
            </button>
          </Card>
        )}

        {/* Upload QR image */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Or upload a QR image</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload QR image"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-card-border bg-muted-bg py-3.5 text-xs font-semibold text-muted hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
          >
            <Icon name="plus" size={15} />
            Upload QR Image
          </button>
        </div>

        {/* Manual entry */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Or enter UPI ID manually</p>
          <Card className="p-4">
            <form onSubmit={handleManualSubmit} className="space-y-3" noValidate>
              <div>
                <label htmlFor="qr-name" className="block text-xs font-medium text-muted mb-1">Recipient Name (optional)</label>
                <input
                  id="qr-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="qr-upi" className="block text-xs font-medium text-muted mb-1">
                    UPI ID <span className="text-red-500">*</span>
                  </label>
                <input
                  id="qr-upi"
                  type="text"
                  value={manualUpi}
                  onChange={(e) => { setManualUpi(e.target.value); setManualError(""); }}
                  placeholder="e.g. rahul@demo"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground outline-none focus:ring-2 focus:ring-primary font-mono"
                  aria-describedby={manualError ? "qr-upi-err" : undefined}
                />
                {manualError && <p id="qr-upi-err" role="alert" className="text-[11px] text-red-500 mt-1">{manualError}</p>}
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer">
                Continue
              </button>
            </form>
          </Card>
        </div>

        <DisclaimerBanner text="QR scanning only decodes data. No real payments are initiated." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer Form
// ─────────────────────────────────────────────────────────────────────────────

interface TransferFormProps {
  initial?: Partial<TransferFormData>;
  onReview: (data: TransferFormData) => void;
  onCancel: () => void;
}

function TransferForm({ initial, onReview, onCancel }: TransferFormProps) {
  const [form, setForm] = useState<TransferFormData>({
    recipientName: initial?.recipientName ?? "",
    upiId: initial?.upiId ?? "",
    amount: initial?.amount ?? "",
    note: initial?.note ?? "",
    category: initial?.category ?? "Others",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TransferFormData, string>>>({});
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial?.upiId && !initial?.amount) {
      const timer = setTimeout(() => amountInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    // recipientName is intentionally NOT validated — it is optional
    if (!form.upiId.trim()) {
      e.upiId = "Please enter a UPI ID.";
    } else if (!validateUpiId(form.upiId)) {
      e.upiId = "Enter a valid UPI ID (e.g. name@upi)";
    }
    const numAmount = parseFloat(form.amount);
    if (!form.amount.trim()) {
      e.amount = "Please enter an amount.";
    } else if (isNaN(numAmount) || numAmount <= 0) {
      e.amount = "Enter an amount greater than ₹0.";
    } else if (numAmount > 100000) {
      e.amount = "Maximum transfer amount is ₹1,00,000.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validate()) onReview(form);
  };

  const setField = (field: keyof TransferFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <button type="button" onClick={onCancel} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted cursor-pointer">
          <Icon name="arrow-right" size={16} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Send Money</h2>
          <p className="text-xs text-muted">Enter recipient details and amount</p>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* UPI ID — required */}
          <div>
            <label htmlFor="tf-upi" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              UPI ID <span className="text-red-500">*</span>
            </label>
            <input
              id="tf-upi"
              type="text"
              value={form.upiId}
              onChange={setField("upiId")}
              placeholder="e.g. rahul@demo"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/50 font-mono"
              aria-describedby={errors.upiId ? "tf-upi-err" : undefined}
            />
            {errors.upiId && <p id="tf-upi-err" role="alert" className="text-[11px] text-red-500 mt-1">{errors.upiId}</p>}
          </div>

          {/* Recipient Name — optional */}
          <div>
            <label htmlFor="tf-name" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Recipient Name <span className="text-[10px] font-normal text-muted normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="tf-name"
              type="text"
              value={form.recipientName}
              onChange={setField("recipientName")}
              placeholder="e.g. Rahul Sharma"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/50"
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="tf-amount" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-bold text-muted pointer-events-none">₹</span>
              <input
                id="tf-amount"
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={setField("amount")}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-2xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/30 font-mono"
                aria-describedby={errors.amount ? "tf-amt-err" : undefined}
              />
            </div>
            {errors.amount && <p id="tf-amt-err" role="alert" className="text-[11px] text-red-500 mt-1">{errors.amount}</p>}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {[100, 250, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(form.amount) || 0;
                    setForm((p) => ({ ...p, amount: String(cur + v) }));
                    setErrors((p) => ({ ...p, amount: undefined }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-card border border-card-border text-[11px] font-semibold text-muted hover:text-primary hover:border-primary shrink-0 cursor-pointer transition-all"
                >
                  +₹{v}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <span className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Category</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Spending category">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, category: cat.id }))}
                  aria-pressed={form.category === cat.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    form.category === cat.id
                      ? "bg-primary-soft/50 border-primary ring-1 ring-primary text-foreground font-bold"
                      : "bg-card border-card-border hover:bg-muted-bg text-muted"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${cat.color}`}>
                    {cat.label[0]}
                  </span>
                  <span className="text-xs truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="tf-note" className="block text-xs font-medium text-muted mb-1">Note (Optional)</label>
            <input
              id="tf-note"
              type="text"
              value={form.note}
              onChange={setField("note")}
              placeholder="e.g. Lunch, groceries…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/50"
            />
          </div>

          {/* ── Demo transfer actions ── */}
          <div className="pt-2 space-y-3">
            <DisclaimerBanner />
            <div className="flex gap-2.5">
              <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg cursor-pointer transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
                Review Transfer
              </button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile detection hook
// ─────────────────────────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth < 768,
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pay via UPI — independent form (Enter UPI ID flow)
// ─────────────────────────────────────────────────────────────────────────────

interface UpiPayFormData {
  upiId: string;
  amount: string;
  recipientName: string;
  note: string;
}

interface UpiPayFormProps {
  initial?: Partial<UpiPayFormData>;
  onPay: (data: UpiPayFormData) => void;
  onCancel: () => void;
}

function UpiPayForm({ initial, onPay, onCancel }: UpiPayFormProps) {
  const [form, setForm] = useState<UpiPayFormData>({
    upiId: initial?.upiId ?? "",
    amount: initial?.amount ?? "",
    recipientName: initial?.recipientName ?? "",
    note: initial?.note ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UpiPayFormData, string>>>({});
  const amountRef = useRef<HTMLInputElement>(null);

  // Auto-focus amount when prefilled from QR
  useEffect(() => {
    if (initial?.upiId && !initial?.amount) {
      const t = setTimeout(() => amountRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.upiId.trim()) {
      e.upiId = "Please enter a UPI ID.";
    } else if (!validateUpiId(form.upiId)) {
      e.upiId = "Enter a valid UPI ID (e.g. rahul@upi)";
    }
    const num = parseFloat(form.amount);
    if (!form.amount.trim()) {
      e.amount = "Please enter an amount.";
    } else if (isNaN(num) || num <= 0) {
      e.amount = "Enter an amount greater than ₹0.";
    } else if (num > 100000) {
      e.amount = "Maximum amount is ₹1,00,000.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const setF = (f: keyof UpiPayFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    setErrors((p) => ({ ...p, [f]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validate()) onPay(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <button type="button" onClick={onCancel} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted cursor-pointer">
          <Icon name="arrow-right" size={16} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Pay via UPI</h2>
          <p className="text-xs text-muted">Enter recipient UPI ID and amount</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
          <Icon name="send" size={9} />
          REAL
        </span>
      </div>

      <Card className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* UPI ID */}
          <div>
            <label htmlFor="upi-id" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              UPI ID <span className="text-red-500">*</span>
            </label>
            <input
              id="upi-id"
              type="text"
              inputMode="email"
              value={form.upiId}
              onChange={setF("upiId")}
              placeholder="e.g. rahul@upi"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-muted/50 font-mono"
              aria-describedby={errors.upiId ? "upif-upi-err" : undefined}
            />
            {errors.upiId && <p id="upif-upi-err" role="alert" className="text-[11px] text-red-500 mt-1">{errors.upiId}</p>}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="upi-amount" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-bold text-muted pointer-events-none">₹</span>
              <input
                id="upi-amount"
                ref={amountRef}
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={setF("amount")}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-2xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-muted/30 font-mono"
                aria-describedby={errors.amount ? "upif-amt-err" : undefined}
              />
            </div>
            {errors.amount && <p id="upif-amt-err" role="alert" className="text-[11px] text-red-500 mt-1">{errors.amount}</p>}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {[100, 250, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(form.amount) || 0;
                    setForm((p) => ({ ...p, amount: String(cur + v) }));
                    setErrors((p) => ({ ...p, amount: undefined }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-card border border-card-border text-[11px] font-semibold text-muted hover:text-blue-600 hover:border-blue-500 shrink-0 cursor-pointer transition-all"
                >
                  +₹{v}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Name — optional */}
          <div>
            <label htmlFor="upi-name" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Recipient Name <span className="text-[10px] font-normal text-muted normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="upi-name"
              type="text"
              value={form.recipientName}
              onChange={setF("recipientName")}
              placeholder="e.g. Rahul Sharma"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-muted/50"
            />
          </div>

          {/* Note — optional */}
          <div>
            <label htmlFor="upi-note" className="block text-xs font-medium text-muted mb-1">Note (Optional)</label>
            <input
              id="upi-note"
              type="text"
              value={form.note}
              onChange={setF("note")}
              placeholder="e.g. Rent, groceries…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-muted/50"
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-[11px] text-blue-700 dark:text-blue-400">
            <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
            <span>
              Spendly never collects your UPI PIN, OTP, or bank credentials.
              Payment is completed inside your UPI app.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg cursor-pointer transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Icon name="send" size={14} />
              Pay with UPI
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pay via UPI — Return screen (after UPI app redirect)
// ─────────────────────────────────────────────────────────────────────────────

interface UpiPayReturnProps {
  upiId: string;
  amount: number;
  recipientName?: string;
  onDone: () => void;
  onBack: () => void;
}

function UpiPayReturnScreen({ upiId, amount, recipientName, onDone, onBack }: UpiPayReturnProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-1">
        <button type="button" onClick={onBack} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted cursor-pointer">
          <Icon name="arrow-right" size={16} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Payment App Opened</h2>
          <p className="text-xs text-muted">Complete the payment in your UPI app</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-4 ring-blue-500/10">
            <span className="text-3xl" aria-hidden="true">📱</span>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Payment app opened</p>
            <p className="text-xs text-muted mt-1">Complete the payment in your UPI app, then return here.</p>
          </div>
        </div>

        <div className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {recipientName?.trim() && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted">Recipient</span>
              <span className="text-sm font-semibold text-foreground">{recipientName}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted">UPI ID</span>
            <span className="text-sm font-semibold text-foreground font-mono truncate max-w-[180px]">{upiId}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted">Amount</span>
            <span className="text-sm font-semibold text-foreground">{formatINR(amount)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted">Status</span>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Unverified</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/6 px-3 py-2.5 text-[11px] text-amber-700 dark:text-amber-400">
          <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0" />
          <span>
            Payment status could not be verified. Spendly cannot confirm
            whether the payment was completed. Please check your UPI app directly.
          </span>
        </div>
      </Card>

      <div className="flex gap-2.5">
        <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg cursor-pointer transition-colors">
          Go Back
        </button>
        <button type="button" onClick={onDone} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
          Done
        </button>
      </div>

      <p className="text-[10px] text-muted text-center leading-relaxed">
        Spendly does not process, hold, or verify any UPI payment.
        The actual payment occurs in your UPI application.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pay via UPI — desktop informational card
// ─────────────────────────────────────────────────────────────────────────────

function UpiDesktopInfo() {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-blue-500/10">
        <span className="text-3xl" aria-hidden="true">📱</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">Use your mobile to pay</p>
        <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
          UPI payments are supported on mobile devices with a compatible UPI app
          (Google Pay, PhonePe, BHIM, Paytm, etc.).
        </p>
      </div>
      <div className="rounded-xl bg-muted-bg border border-card-border px-4 py-3 text-xs text-muted text-center leading-relaxed max-w-xs mx-auto">
        Open Spendly on your phone to continue with UPI payment.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pay via UPI — home card (shown on Transfer home screen)
// ─────────────────────────────────────────────────────────────────────────────

interface PayViaUpiCardProps {
  isMobile: boolean;
  onEnterUpiId: () => void;
  onScanQr: () => void;
}

function PayViaUpiCard({ isMobile, onEnterUpiId, onScanQr }: PayViaUpiCardProps) {
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-card shadow-card overflow-hidden">
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-card-border bg-gradient-to-br from-blue-500/5 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-foreground">Pay via UPI</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                <Icon name="send" size={9} />
                REAL
              </span>
            </div>
            <p className="text-xs text-muted leading-snug">Pay directly using your preferred UPI app</p>
          </div>
          <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl" aria-hidden="true">
            📱
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        {isMobile ? (
          <div className="space-y-3">
            {/* Two action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onEnterUpiId}
                className="group flex flex-col items-center gap-2.5 rounded-xl border border-card-border bg-muted-bg p-4 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer"
                aria-label="Enter UPI ID to pay"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
                  <Icon name="pencil" size={18} />
                </span>
                <div className="text-center">
                  <p className="text-xs font-bold text-foreground">Enter UPI ID</p>
                  <p className="text-[10px] text-muted mt-0.5 leading-tight">Enter recipient details</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onScanQr}
                className="group flex flex-col items-center gap-2.5 rounded-xl border border-card-border bg-muted-bg p-4 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer"
                aria-label="Scan QR code to pay"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
                  <Icon name="qr-code" size={18} />
                </span>
                <div className="text-center">
                  <p className="text-xs font-bold text-foreground">Scan QR</p>
                  <p className="text-[10px] text-muted mt-0.5 leading-tight">Scan recipient QR</p>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-muted text-center leading-snug">
              Works with Google Pay, PhonePe, BHIM, Paytm &amp; other UPI apps
            </p>
          </div>
        ) : (
          <UpiDesktopInfo />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Screen
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewScreenProps {
  data: TransferFormData;
  onConfirm: () => void;
  onCancel: () => void;
}

function ReviewScreen({ data, onConfirm, onCancel }: ReviewScreenProps) {
  const amount = parseFloat(data.amount);
  const rows = [
    // Only show Recipient row when a name was provided
    ...(data.recipientName.trim() ? [{ label: "Recipient", value: data.recipientName, mono: false }] : []),
    { label: "UPI ID", value: data.upiId, mono: true },
    { label: "Category", value: data.category, mono: false },
    ...(data.note ? [{ label: "Note", value: data.note, mono: false }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <button type="button" onClick={onCancel} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted cursor-pointer">
          <Icon name="arrow-right" size={16} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Review Transfer</h2>
          <p className="text-xs text-muted">Confirm the details before proceeding</p>
        </div>
      </div>

      <DisclaimerBanner />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-5 py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">You&apos;re sending</p>
          <p className="text-4xl font-extrabold font-mono">{formatINR(amount)}</p>
          <p className="text-xs opacity-70 mt-1">Demo only — not a real payment</p>
        </div>
        <div className="divide-y divide-card-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs text-muted">{row.label}</span>
              <span className={`text-sm font-semibold text-foreground ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2.5">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg cursor-pointer transition-colors">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
          Confirm Transfer
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Processing Screen
// ─────────────────────────────────────────────────────────────────────────────

function ProcessingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-5">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="send" size={32} className="text-primary animate-pulse" />
        <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" aria-hidden="true" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-bold text-foreground">Processing transfer…</p>
        <p className="text-xs text-muted">Simulating demo transaction</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success Screen
// ─────────────────────────────────────────────────────────────────────────────

interface SuccessScreenProps {
  transfer: CompletedTransfer;
  onDone: () => void;
  onViewHistory: () => void;
}

function SuccessScreen({ transfer, onDone, onViewHistory }: SuccessScreenProps) {
  const ts = new Date(transfer.timestamp);
  const dateStr = ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const rows = [
    { label: "Sent to", value: transfer.recipientName, green: false, mono: false },
    { label: "UPI ID", value: transfer.upiId, green: false, mono: true },
    { label: "Transaction ID", value: transfer.transactionId, green: false, mono: true },
    { label: "Date & Time", value: `${dateStr}, ${timeStr}`, green: false, mono: false },
    { label: "Status", value: "Successful", green: true, mono: false },
    { label: "Category", value: transfer.category, green: false, mono: false },
  ];

  return (
    <div className="space-y-4 text-center">
      <div className="flex flex-col items-center py-6 space-y-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-4 ring-emerald-500/20">
          <Icon name="check-circle" size={40} />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">Transfer Successful</h2>
        <p className="text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
          {formatINR(transfer.amount)}
        </p>
      </div>

      <Card className="text-left divide-y divide-card-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3.5">
            <span className="text-xs text-muted">{row.label}</span>
            <span className={`text-sm font-semibold ${row.green ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"} ${row.mono ? "font-mono text-xs" : ""}`}>
              {row.value}
            </span>
          </div>
        ))}
      </Card>

      <DisclaimerBanner text="Demo transaction — no real money was transferred." />

      <div className="flex gap-2.5">
        <button type="button" onClick={onViewHistory} className="flex-1 py-3 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg cursor-pointer transition-colors">
          View Transaction
        </button>
        <button type="button" onClick={onDone} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity shadow-sm">
          Done
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent Transfers List
// ─────────────────────────────────────────────────────────────────────────────

function RecentTransfers({ transfers }: { transfers: CompletedTransfer[] }) {
  // Memoise the "now" timestamp so it doesn't change between renders
  const now = useMemo(() => new Date().getTime(), []);

  if (transfers.length === 0) return null;

  return (
    <section className="recent-transfers-section">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted px-1 mb-3">
        Recent Transfers
      </h2>
      <div className="divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border bg-card shadow-card">
        {transfers.slice(0, 10).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted-bg transition-colors">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLOR[t.category] ?? "bg-slate-500/10 text-slate-500"}`}>
              <Icon name="send" size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{t.recipientName}</p>
              <p className="text-xs text-muted truncate">{t.upiId}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-foreground">{formatINR(t.amount)}</p>
              <p className="text-xs text-muted">{relativeTransferDate(t.timestamp, now)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// relativeTransferDate — pure helper used by RecentTransfers
// ─────────────────────────────────────────────────────────────────────────────

function relativeTransferDate(isoString: string, now: number): string {
  const diff = Math.floor((now - new Date(isoString).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer Page (root component)
// ─────────────────────────────────────────────────────────────────────────────

export default function TransferPage() {
  const isMobile = useIsMobile();

  // ── Demo transfer flow state ──
  const [step, setStep] = useState<TransferStep>("home");
  const [formData, setFormData] = useState<TransferFormData | null>(null);
  const [completedTransfer, setCompletedTransfer] = useState<CompletedTransfer | null>(null);
  // Lazy initialiser reads localStorage only once, on mount — no effect needed
  const [transfers, setTransfers] = useState<CompletedTransfer[]>(loadTransfers);
  const [showQRGen, setShowQRGen] = useState(false);
  const submittingRef = useRef(false);

  // ── UPI pay flow state ──
  const [upiPayData, setUpiPayData] = useState<UpiPayFormData | null>(null);
  // Track which flow opened the QR scanner so we route the result correctly
  const [qrOrigin, setQrOrigin] = useState<"demo" | "upi">("demo");

  // ── Demo flow: QR scanned → pre-fill demo transfer form ──
  const handleDemoQRScanned = useCallback((data: { recipientName: string; upiId: string }) => {
    setFormData({
      recipientName: data.recipientName,
      upiId: data.upiId,
      amount: "",
      note: "",
      category: "Others",
    });
    setStep("form");
  }, []);

  // ── UPI flow: QR scanned → pre-fill UPI pay form ──
  const handleUpiQRScanned = useCallback((data: { recipientName: string; upiId: string }) => {
    setUpiPayData({
      upiId: data.upiId,
      amount: "",
      recipientName: data.recipientName,
      note: "",
    });
    setStep("upi-pay-form");
  }, []);

  // ── Demo flow: confirm the simulated transfer ──
  const handleConfirm = useCallback(async () => {
    if (!formData || submittingRef.current) return;
    submittingRef.current = true;
    setStep("processing");

    // Simulate realistic ~1.8s processing delay
    await new Promise<void>((r) => setTimeout(r, 1800));

    const amount = parseFloat(formData.amount);
    const txId = generateDemoTxId();
    const now = new Date();

    const completed: CompletedTransfer = {
      id: crypto.randomUUID(),
      recipientName: formData.recipientName,
      upiId: formData.upiId,
      amount,
      category: formData.category,
      note: formData.note,
      timestamp: now.toISOString(),
      transactionId: txId,
    };

    // Persist to localStorage so history survives page reload
    const updated = [completed, ...transfers].slice(0, 50);
    setTransfers(updated);
    saveTransfers(updated);

    // Create a real Spendly transaction so it appears in Money, Analytics, AI Insights
    const merchantLabel = formData.recipientName.trim()
      ? `Transfer → ${formData.recipientName.trim()}`
      : `Transfer → ${formData.upiId}`;

    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        type: "expense",
        category: formData.category,
        merchant: merchantLabel,
        description: [
          formData.note,
          `UPI: ${formData.upiId}`,
          `Demo Txn: ${txId}`,
        ]
          .filter(Boolean)
          .join(" | "),
        transactionDate: now.toISOString().slice(0, 10),
      }),
    }).catch(console.error);

    setCompletedTransfer(completed);
    submittingRef.current = false;
    setStep("success");
  }, [formData, transfers]);

  // ── UPI flow: launch UPI app via upi:// URI ──
  const handleUpiPay = useCallback((data: UpiPayFormData) => {
    setUpiPayData(data);
    const amount = parseFloat(data.amount);
    const uri = buildUpiUri(data.upiId, amount, data.recipientName, data.note);
    // window.open with _self triggers the UPI app chooser on Android/iOS
    // without navigating away from Spendly.  On desktop the scheme simply
    // fails silently — the return screen explains this.
    window.open(uri, "_self");
    setStep("upi-pay-return");
  }, []);

  // ── QR scanner: route result to correct flow based on origin ──
  const handleQRScanned = useCallback(
    (data: { recipientName: string; upiId: string }) => {
      if (qrOrigin === "upi") {
        handleUpiQRScanned(data);
      } else {
        handleDemoQRScanned(data);
      }
    },
    [qrOrigin, handleUpiQRScanned, handleDemoQRScanned],
  );

  // ── Full-screen QR Scanner (both flows share the same component) ──
  if (step === "qr-scanner" || step === "upi-pay-qr") {
    return (
      <QRScanner
        onScanned={handleQRScanned}
        onClose={() => setStep("home")}
      />
    );
  }

  return (
    <div className="relative pb-28 md:pb-12">
      {/* Demo QR Generator overlay */}
      {showQRGen && <DemoQRGenerator onClose={() => setShowQRGen(false)} />}

      {/* Page header (only on home / processing states) */}
      {(step === "home" || step === "processing") && (
        <div className="dashboard-enter" style={{ animationDelay: "0ms" }}>
          <header className="flex items-center justify-between px-1 py-5">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-foreground">Transfer</h1>
              <p className="mt-0.5 text-xs text-muted">Send money securely with Spendly</p>
            </div>
            <div className="flex items-center gap-2">
              <DemoTag />
              <UserAvatar />
            </div>
          </header>
        </div>
      )}

      {/* ── HOME ── */}
      {step === "home" && (
        <div className="space-y-6">
          {/* ── Pay via UPI card (top / primary) ── */}
          <div className="dashboard-enter" style={{ animationDelay: "80ms" }}>
            <PayViaUpiCard
              isMobile={isMobile}
              onEnterUpiId={() => { setUpiPayData(null); setStep("upi-pay-form"); }}
              onScanQr={() => { setQrOrigin("upi"); setStep("upi-pay-qr"); }}
            />
          </div>

          {/* OR divider */}
          <div className="dashboard-enter flex items-center gap-3" style={{ animationDelay: "160ms" }}>
            <div className="flex-1 h-px bg-card-border" />
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-card-border" />
          </div>

          {/* ── Demo section (below) ── */}
          {/* Demo action cards */}
          <div className="dashboard-enter grid grid-cols-2 gap-3" style={{ animationDelay: "220ms" }}>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-card-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md cursor-pointer"
              aria-label="Open Send Money form"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
                <Icon name="send" size={22} />
              </span>
              <span className="text-sm font-bold text-foreground">Send Money</span>
              <span className="text-[11px] text-muted text-center leading-tight">Transfer via demo UPI</span>
            </button>

            <button
              type="button"
              onClick={() => { setQrOrigin("demo"); setStep("qr-scanner"); }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-card-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md cursor-pointer"
              aria-label="Open QR scanner for demo transfer"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
                <Icon name="qr-code" size={22} />
              </span>
              <span className="text-sm font-bold text-foreground">Scan QR</span>
              <span className="text-[11px] text-muted text-center leading-tight">Scan a demo UPI QR</span>
            </button>
          </div>

          {/* Show Demo QR */}
          <div className="dashboard-enter" style={{ animationDelay: "300ms" }}>
            <button
              type="button"
              onClick={() => setShowQRGen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-card-border bg-muted-bg py-3 text-xs font-semibold text-muted hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              aria-label="Show my demo QR code"
            >
              <Icon name="qr-code" size={14} />
              Show My Demo QR
            </button>
          </div>

          {/* Disclaimer */}
          <div className="dashboard-enter" style={{ animationDelay: "360ms" }}>
            <DisclaimerBanner />
          </div>

          {/* Recent transfers */}
          <div className="dashboard-enter" style={{ animationDelay: "440ms" }}>
            <RecentTransfers transfers={transfers} />
          </div>
        </div>
      )}

      {/* ── DEMO FORM ── */}
      {step === "form" && (
        <div className="dashboard-enter mt-2" style={{ animationDelay: "0ms" }}>
          <TransferForm
            initial={formData ?? undefined}
            onReview={(data) => { setFormData(data); setStep("review"); }}
            onCancel={() => { setFormData(null); setStep("home"); }}
          />
        </div>
      )}

      {/* ── DEMO REVIEW ── */}
      {step === "review" && formData && (
        <div className="dashboard-enter mt-2" style={{ animationDelay: "0ms" }}>
          <ReviewScreen
            data={formData}
            onConfirm={handleConfirm}
            onCancel={() => setStep("form")}
          />
        </div>
      )}

      {/* ── DEMO PROCESSING ── */}
      {step === "processing" && <ProcessingScreen />}

      {/* ── DEMO SUCCESS ── */}
      {step === "success" && completedTransfer && (
        <div className="dashboard-enter mt-2" style={{ animationDelay: "0ms" }}>
          <SuccessScreen
            transfer={completedTransfer}
            onDone={() => { setStep("home"); setFormData(null); setCompletedTransfer(null); }}
            onViewHistory={() => {
              setStep("home");
              setFormData(null);
              setCompletedTransfer(null);
              setTimeout(() => {
                document.querySelector(".recent-transfers-section")?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          />
        </div>
      )}

      {/* ── UPI PAY FORM ── */}
      {step === "upi-pay-form" && (
        <div className="dashboard-enter mt-2" style={{ animationDelay: "0ms" }}>
          <UpiPayForm
            initial={upiPayData ?? undefined}
            onPay={handleUpiPay}
            onCancel={() => { setUpiPayData(null); setStep("home"); }}
          />
        </div>
      )}

      {/* ── UPI PAY RETURN ── */}
      {step === "upi-pay-return" && upiPayData && (
        <div className="dashboard-enter mt-2" style={{ animationDelay: "0ms" }}>
          <UpiPayReturnScreen
            upiId={upiPayData.upiId}
            amount={parseFloat(upiPayData.amount)}
            recipientName={upiPayData.recipientName}
            onDone={() => { setUpiPayData(null); setStep("home"); }}
            onBack={() => setStep("upi-pay-form")}
          />
        </div>
      )}
    </div>
  );
}
