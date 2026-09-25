"use client";

import { useState, useRef, useCallback } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import type { Category } from "@/lib/types";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultMode?: "ai" | "manual";
}

interface ParsedResult {
  amount: number;
  category: Category;
  type: "expense" | "income";
  merchant: string;
  description: string;
  confidence: number;
  source: "rule" | "ai";
}

const CATEGORIES: { id: Category; label: string; icon: IconName; colorClass: string }[] = [
  { id: "Food", label: "Food", icon: "utensils", colorClass: "text-amber-500 bg-amber-500/10" },
  { id: "Transport", label: "Transport", icon: "car", colorClass: "text-blue-500 bg-blue-500/10" },
  { id: "Shopping", label: "Shopping", icon: "shopping-bag", colorClass: "text-purple-500 bg-purple-500/10" },
  { id: "Entertainment", label: "Fun", icon: "film", colorClass: "text-rose-500 bg-rose-500/10" },
  { id: "Bills", label: "Bills", icon: "receipt", colorClass: "text-emerald-500 bg-emerald-500/10" },
  { id: "Others", label: "Others", icon: "wallet", colorClass: "text-slate-500 bg-slate-500/10" },
];

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000];

const SAMPLE_PROMPTS = [
  "🍔 Swiggy dinner 450 rs",
  "🚕 Uber to office 280",
  "⚡ Electricity bill 1850",
  "🛒 Blinkit groceries 620",
  "☕ Starbucks coffee 350",
  "💰 Salary 75000 credited",
];

export function AddTransactionModal({
  open,
  onClose,
  onAdded,
  defaultMode = "ai",
}: AddTransactionModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "manual">(defaultMode);
  
  // AI Voice / Text Logger State
  const [promptText, setPromptText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResult | null>(null);
  const [speechSupported] = useState(() => {
    if (typeof window === "undefined") return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  // Using any to safely reference window.webkitSpeechRecognition / window.SpeechRecognition without ambient declaration conflicts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Manual Form State
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParseText = useCallback(async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions/parse-natural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToParse }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse text");
      }
      setParsedData(data.data);
      // Pre-fill manual form as well
      setAmount(String(data.data.amount));
      setType(data.data.type);
      setCategory(data.data.category);
      setMerchant(data.data.merchant);
      setDescription(data.data.description);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Parsing failed");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please type your expense.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setPromptText(spoken);
        setIsListening(false);
        handleParseText(spoken);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch {
      setIsListening(false);
      setError("Could not access microphone. Please check permissions or type your expense.");
    }
  };

  const handleInstantSaveParsed = async () => {
    if (!parsedData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedData.amount,
          type: parsedData.type,
          category: parsedData.category,
          merchant: parsedData.merchant,
          description: parsedData.description,
          transactionDate: date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record transaction");
      }

      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          type,
          category: type === "income" ? "Others" : category,
          merchant: merchant || (type === "income" ? "Salary / Credit" : "Expense"),
          description,
          transactionDate: date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add transaction");
      }

      // Reset form
      setAmount("");
      setMerchant("");
      setDescription("");
      setPromptText("");
      setParsedData(null);
      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + val));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-card-border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-xs">
              <Icon name={activeTab === "ai" ? "sparkles" : "plus"} size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {activeTab === "ai" ? "Voice & AI Smart Log" : "Record Transaction"}
              </h2>
              <p className="text-[11px] text-muted">
                {activeTab === "ai"
                  ? "Speak or type naturally (e.g. 'Swiggy dinner 450 rs')"
                  : "Fill details manually"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted transition-colors cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted-bg border border-card-border">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "ai"
                ? "bg-card text-primary shadow-xs border border-card-border"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon name="sparkles" size={14} />
            <span>AI Voice & Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-card text-foreground shadow-xs border border-card-border"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon name="receipt" size={14} />
            <span>Manual Form</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
            <Icon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: AI VOICE & NATURAL LANGUAGE */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            {/* Input area with mic button */}
            <div className="relative">
              <textarea
                rows={3}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Say or type e.g., 'Swiggy dinner 450 rs', 'Uber cab 280', or 'Salary 75000 credited'..."
                className="w-full pl-4 pr-14 py-3 text-sm rounded-2xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted/60 resize-none font-sans"
              />

              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Listening... click to stop" : "Click to speak"}
                className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30 scale-105"
                    : speechSupported
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
                    : "bg-muted-bg text-muted cursor-not-allowed opacity-50"
                }`}
              >
                <Icon name={isListening ? "mic-off" : "mic"} size={20} />
              </button>
            </div>

            {isListening && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-red-500 animate-pulse py-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Listening to your voice... Speak now!
              </div>
            )}

            {/* Quick Sample Prompts */}
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                Quick Examples (Click to test):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setPromptText(sample);
                      handleParseText(sample);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-card border border-card-border text-xs text-muted hover:text-foreground hover:border-primary transition-all cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!promptText.trim() || isParsing}
                onClick={() => handleParseText(promptText)}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="sparkles" size={15} />
                <span>{isParsing ? "Analyzing with AI..." : "Parse Transaction"}</span>
              </button>
            </div>

            {/* Parsed Result Card */}
            {parsedData && (
              <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Icon name="sparkles" size={13} />
                    AI Detected Details
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card border border-card-border text-foreground">
                      {Math.round(parsedData.confidence * 100)}% Confidence
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-card text-muted">
                      {parsedData.source.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-card p-3 rounded-xl border border-card-border">
                  <div>
                    <span className="text-[10px] font-semibold text-muted uppercase">Amount</span>
                    <p className={`text-xl font-bold font-mono ${parsedData.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                      {parsedData.type === "income" ? "+" : "-"} {formatINR(parsedData.amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted uppercase">Category</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {parsedData.category}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted uppercase">Merchant / Payee</span>
                    <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                      {parsedData.merchant}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted uppercase">Type</span>
                    <p className="text-xs font-semibold uppercase text-muted mt-0.5">
                      {parsedData.type}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-card border border-card-border text-xs font-semibold text-foreground hover:bg-muted-bg transition-colors cursor-pointer"
                  >
                    Edit in Manual Form
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleInstantSaveParsed}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Icon name="check" size={14} />
                    <span>{loading ? "Saving..." : "Instant Save"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL FORM */}
        {activeTab === "manual" && (
          <form onSubmit={handleSubmitManual} className="space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted-bg border border-card-border">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === "expense"
                    ? "bg-card text-red-500 dark:text-red-400 shadow-xs border border-card-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === "income"
                    ? "bg-card text-emerald-500 dark:text-emerald-400 shadow-xs border border-card-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Income (+)
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Amount (₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xl font-bold text-muted">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-2xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted/40 font-mono"
                />
              </div>
              {/* Quick amount buttons */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="px-2.5 py-1 rounded-lg bg-card border border-card-border text-[11px] font-semibold text-muted hover:text-primary hover:border-primary transition-all shrink-0 cursor-pointer"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Category picker (Only for expenses) */}
            {type === "expense" && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary-soft/50 border-primary ring-1 ring-primary text-foreground font-bold shadow-xs"
                            : "bg-card border-card-border hover:bg-muted-bg text-muted"
                        }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cat.colorClass}`}>
                          <Icon name={cat.icon} size={15} />
                        </span>
                        <span className="text-xs truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Merchant / Description fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {type === "expense" ? "Merchant / Payee" : "Source"}
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder={type === "expense" ? "e.g. Swiggy, Uber, Amazon" : "e.g. Salary, Dividend"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Note (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lunch with team"
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted/60"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {loading ? "Recording..." : "Save Transaction"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
