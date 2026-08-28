"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Icon } from "@/components/ui/Icon";
import { PurchaseSimulatorModal } from "./PurchaseSimulatorModal";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface FinancialAdvisorModalProps {
  open: boolean;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  "Can I afford a ₹10,000 purchase?",
  "How is my daily Safe-to-Spend calculated?",
  "Where can I cut expenses this week?",
  "How to reach my goals faster?",
];

// Helper to render formatted text with proper bolding and structure (no raw markdown symbols)
function FormattedMessageText({ text }: { text: string }) {
  const baseId = useId();
  // Split into paragraphs / lines
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`empty-${baseId}-${lineIdx}`} className="h-1.5" />;
        }

        // Special highlight badge for structured sections
        const isKeyInsight = trimmed.startsWith("💡");
        const isRecommendation = trimmed.startsWith("✅");
        const isImpact = trimmed.startsWith("📊");
        const isWarning = trimmed.startsWith("⚠️");
        const isNextStep = trimmed.startsWith("🎯");

        if (isKeyInsight || isRecommendation || isImpact || isWarning || isNextStep) {
          return (
            <div
              key={`callout-${baseId}-${lineIdx}`}
              className={`p-2.5 rounded-xl border text-xs font-medium ${
                isKeyInsight
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
                  : isRecommendation
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                  : isImpact
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200"
                  : isWarning
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200"
                  : "bg-purple-500/10 border-purple-500/20 text-purple-900 dark:text-purple-200"
              }`}
            >
              {renderFormattedInline(trimmed, `${baseId}-${lineIdx}`)}
            </div>
          );
        }

        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const content = isBullet ? trimmed.replace(/^(\s*[•*-]\s*)/, "") : trimmed;

        return (
          <div
            key={`line-${baseId}-${lineIdx}`}
            className={isBullet ? "flex items-start gap-2 pl-1" : ""}
          >
            {isBullet && (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
            <p className={isBullet ? "flex-1" : ""}>
              {renderFormattedInline(content, `${baseId}-${lineIdx}`)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Inline parser for bold (**text**) and code formatting
function renderFormattedInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${keyPrefix}-c-${idx}`}
          className="px-1.5 py-0.5 rounded bg-muted-bg border border-card-border font-mono text-xs text-foreground font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-t-${idx}`}>{part}</span>;
  });
}

export function FinancialAdvisorModal({ open, onClose }: FinancialAdvisorModalProps) {
  const messageCounterRef = useRef(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "👋 Hello! I am your **Financial Copilot**.\n\nI have live context of your monthly income, safe-to-spend allowance, and active goals. How can I help you plan or make a decision today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!open) return null;

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    messageCounterRef.current += 1;
    const userMsgId = `user-${messageCounterRef.current}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const reply = data.reply || "Sorry, I could not generate a response. Please try again.";

      messageCounterRef.current += 1;
      const aiMsgId = `assistant-${messageCounterRef.current}`;
      const aiMsg: Message = {
        id: aiMsgId,
        sender: "assistant",
        text: reply,
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      messageCounterRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${messageCounterRef.current}`,
          sender: "assistant",
          text: "Connection issue. Please check your network and try again.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/25 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Soft Ambient Background Glows */}
        <div className="absolute -z-10 h-72 w-72 rounded-full bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -z-10 translate-x-32 translate-y-32 h-64 w-64 rounded-full bg-gradient-to-bl from-pink-500/15 via-purple-500/15 to-emerald-500/15 blur-3xl opacity-50 pointer-events-none" />

        {/* Modal Container */}
        <div
          className="
              relative flex w-full max-w-3xl flex-col overflow-hidden
              rounded-3xl border border-white/70
              bg-white/75 backdrop-blur-2xl
              shadow-2xl shadow-blue-500/20
              h-[min(760px,calc(100vh-32px))]
            "
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Financial Copilot"
        >
          {/* TOP DECORATIVE ACCENT LINE */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-80" />

          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/50 backdrop-blur-xl px-5 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-indigo-500/15 to-purple-500/20 text-primary border border-primary/25 shadow-inner">
                <Icon name="sparkles" size={20} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>

              <div>
                <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Financial Copilot
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    AI Engine
                  </span>
                </h2>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs font-medium text-muted">
                    Connected to your financial data
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulatorOpen(true)}
                className="
                  flex items-center gap-1.5 rounded-xl
                  border border-card-border/90
                  bg-muted-bg/80 hover:bg-card-border/40
                  px-3 py-1.5 sm:px-3.5 sm:py-2
                  text-xs font-bold text-foreground
                  transition-all duration-150
                  shadow-2xs hover:shadow-xs
                  cursor-pointer
                "
              >
                <Icon name="calculator" size={14} className="text-primary" />
                <span>Simulate</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-xl text-muted
                  transition-all duration-150
                  hover:bg-muted-bg hover:text-foreground
                  cursor-pointer
                "
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES AREA */}
          <div
            ref={scrollRef}
            className="
              flex-1 overflow-y-auto
              p-4 sm:p-6
              space-y-5
              scrollbar-thin
            "
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary border border-primary/20 shadow-xs mt-0.5">
                    <Icon name="sparkles" size={15} />
                  </div>
                )}

                <div
                  className={`
                    max-w-[85%] sm:max-w-[78%]
                    rounded-2xl px-4 py-3.5
                    shadow-xs transition-all
                    ${
                      msg.sender === "user"
                        ? "rounded-tr-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20"
                        : "rounded-tl-xs border border-white/80 bg-white/70 backdrop-blur-xl text-slate-800 shadow-sm shadow-blue-500/5"
                    }
                  `}
                >
                  <FormattedMessageText text={msg.text} />

                  <span
                    className={`
                      mt-2 block text-[10px] font-medium opacity-60
                      ${msg.sender === "user" ? "text-right" : "text-left"}
                    `}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 animate-in fade-in duration-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary border border-primary/20 shadow-xs">
                  <Icon name="sparkles" size={15} />
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-xs border border-card-border/80 bg-card/75 dark:bg-card/45 backdrop-blur-md px-4 py-3 text-xs font-medium text-muted shadow-xs">
                  <Icon
                    name="refresh-cw"
                    size={14}
                    className="animate-spin text-primary"
                  />
                  <span>Analyzing your live finances & calculating recommendations...</span>
                </div>
              </div>
            )}
          </div>

          {/* SUGGESTED QUESTIONS CHIPS */}
          <div className="border-t border-slate-200/70 bg-white/45 px-5 sm:px-6 py-3 backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted">
              <span>Suggested Questions</span>
              <span className="text-[10px] font-normal text-muted/80 lowercase">instant prompts</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="
                    rounded-xl
                    border border-slate-200/80
                    bg-white/70
                    hover:bg-blue-50
                    hover:border-blue-400
                    hover:text-blue-600
                    px-3 py-1.5 sm:px-3.5 sm:py-2
                    text-xs font-semibold
                    text-foreground/80
                    transition-all duration-150
                    shadow-2xs hover:shadow-xs
                    disabled:opacity-50
                    cursor-pointer active:scale-98
                  "
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="border-t border-slate-200/70 bg-white/50 backdrop-blur-xl p-3 sm:p-4"
          >
            <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-1.5 sm:p-2 transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 shadow-sm">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your finances..."
                disabled={loading}
                className="
                  min-w-0 flex-1
                  bg-transparent
                  px-3 py-2
                  text-xs sm:text-sm
                  text-foreground
                  outline-none
                  placeholder:text-muted
                  font-medium
                "
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="
                  flex h-9 w-9 sm:h-10 sm:w-10 shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                  text-primary-foreground
                  shadow-sm shadow-primary/20
                  transition-all duration-150
                  hover:opacity-95 hover:scale-102
                  disabled:cursor-not-allowed
                  disabled:opacity-40 disabled:hover:scale-100
                  cursor-pointer active:scale-95
                "
              >
                <Icon name="arrow-up" size={17} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <PurchaseSimulatorModal
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </>
  );
}
