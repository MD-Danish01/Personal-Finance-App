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
  "How can I reach my goals faster?",
  "How is my emergency fund progressing?",
];

// Helper to render formatted text with proper bolding, callouts, and lists
function FormattedMessageText({ text }: { text: string }) {
  const baseId = useId();
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`empty-${baseId}-${lineIdx}`} className="h-1.5" />;
        }

        // Structured section badges
        const isKeyInsight = trimmed.startsWith("💡");
        const isRecommendation = trimmed.startsWith("✅");
        const isImpact = trimmed.startsWith("📊");
        const isWarning = trimmed.startsWith("⚠️");
        const isNextStep = trimmed.startsWith("🎯");

        if (isKeyInsight || isRecommendation || isImpact || isWarning || isNextStep) {
          return (
            <div
              key={`callout-${baseId}-${lineIdx}`}
              className={`p-3 rounded-xl border text-xs font-medium ${
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

        const isBullet =
          trimmed.startsWith("•") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ");
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

// Inline parser for bold (**text**) and code formatting (`code`)
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
          className="px-1.5 py-0.5 rounded bg-muted-bg border border-card-border font-mono text-[11px] text-primary font-semibold"
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
      text: "👋 Hello! I am your **Financial Copilot**.\n\nI have live context of your monthly income, safe-to-spend allowance, recent transactions, and goals. How can I assist you with your financial planning today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on modal open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Detect scroll position to show "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: "👋 New conversation started. How can I help you analyze or plan your finances?",
        timestamp: "Just now",
      },
    ]);
  };

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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Soft Ambient Background Glows */}
        <div className="absolute -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl opacity-50 pointer-events-none" />

        {/* Modal Surface */}
        <div
          className="
            relative flex w-full max-w-2xl flex-col overflow-hidden
            rounded-t-3xl sm:rounded-3xl border border-card-border
            bg-card/95 backdrop-blur-2xl text-foreground
            shadow-2xl shadow-black/30
            h-[100dvh] sm:h-[min(740px,calc(100vh-48px))]
            animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200
          "
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Financial Copilot"
        >
          {/* Top Decorative Theme Accent Line */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-500 to-primary/40 opacity-90 shrink-0" />

          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-card-border bg-card/80 backdrop-blur-xl px-4 sm:px-6 py-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary border border-primary-soft-border shadow-inner shrink-0">
                <Icon name="sparkles" size={19} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Financial Copilot
                  <span className="hidden xs:inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary-soft-border">
                    AI Advisor
                  </span>
                </h2>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] font-medium text-muted">
                    Live Context Connected
                  </p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSimulatorOpen(true)}
                title="Simulate purchase feasibility"
                className="
                  flex items-center gap-1.5 rounded-xl
                  border border-card-border
                  bg-muted-bg/80 hover:bg-card-border/50
                  px-2.5 py-1.5 sm:px-3 sm:py-2
                  text-xs font-bold text-foreground
                  transition-all duration-150
                  shadow-2xs hover:shadow-xs
                  cursor-pointer active:scale-95
                "
              >
                <Icon name="calculator" size={14} className="text-primary" />
                <span className="hidden xs:inline">Simulate</span>
              </button>

              <button
                type="button"
                onClick={clearChat}
                title="Start new conversation"
                aria-label="Start new conversation"
                className="
                  flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center
                  rounded-xl border border-card-border bg-muted-bg/60 text-muted
                  transition-all duration-150
                  hover:bg-muted-bg hover:text-foreground
                  cursor-pointer active:scale-95
                "
              >
                <Icon name="refresh-cw" size={14} />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="
                  flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center
                  rounded-xl border border-card-border bg-muted-bg/60 text-muted
                  transition-all duration-150
                  hover:bg-muted-bg hover:text-foreground
                  cursor-pointer active:scale-95
                "
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES SCROLL AREA */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="
              flex-1 overflow-y-auto
              p-4 sm:p-6
              space-y-4 sm:space-y-5
              overscroll-contain
            "
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 group ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary-soft-border shadow-xs mt-0.5">
                    <Icon name="sparkles" size={14} />
                  </div>
                )}

                <div
                  className={`
                    relative max-w-[90%] sm:max-w-[80%]
                    rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5
                    shadow-xs transition-all
                    ${
                      msg.sender === "user"
                        ? "rounded-tr-xs bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20"
                        : "rounded-tl-xs border border-card-border bg-muted-bg/70 text-foreground"
                    }
                  `}
                >
                  <FormattedMessageText text={msg.text} />

                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-current/10">
                    <span className="text-[10px] font-medium opacity-60">
                      {msg.timestamp}
                    </span>

                    {msg.sender === "assistant" && (
                      <button
                        type="button"
                        onClick={() => copyMessage(msg.id, msg.text)}
                        title="Copy message"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] font-bold text-muted hover:text-foreground transition-opacity flex items-center gap-1 cursor-pointer"
                      >
                        <Icon
                          name={copiedId === msg.id ? "check" : "copy"}
                          size={11}
                          className={copiedId === msg.id ? "text-emerald-500" : ""}
                        />
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pulsing Animated Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2.5 sm:gap-3 animate-in fade-in duration-200">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary-soft-border shadow-xs">
                  <Icon name="sparkles" size={14} />
                </div>

                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-card-border bg-muted-bg/80 px-4 py-3 text-xs font-medium text-muted shadow-xs">
                  <span className="flex items-center gap-1 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                  </span>
                  <span className="ml-1 text-muted text-[11px] font-semibold">Analyzing your finances...</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-32 right-6 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Scroll to bottom"
            >
              <Icon name="arrow-down" size={14} />
            </button>
          )}

          {/* QUICK SUGGESTIONS CHIPS (Horizontally Scrollable on Mobile) */}
          <div className="border-t border-card-border bg-card/60 px-3 sm:px-6 py-2.5 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted shrink-0 mr-1 hidden sm:inline">
                Suggested:
              </span>

              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="
                    shrink-0 rounded-xl
                    border border-card-border
                    bg-muted-bg/80 hover:bg-primary-soft hover:border-primary-soft-border hover:text-primary
                    px-2.5 py-1.5 sm:px-3 sm:py-1.5
                    text-[11px] font-semibold text-foreground/90
                    transition-all duration-150
                    shadow-2xs hover:shadow-xs
                    disabled:opacity-50
                    cursor-pointer active:scale-95
                  "
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="border-t border-card-border bg-card/80 backdrop-blur-xl p-3 sm:p-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-card-border bg-muted-bg/90 p-1 sm:p-1.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-xs">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about budget, safe-to-spend, or goals..."
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
                  flex h-8 w-8 sm:h-9 sm:w-9 shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-primary text-primary-foreground
                  shadow-xs shadow-primary/20
                  transition-all duration-150
                  hover:opacity-90 hover:scale-102
                  disabled:cursor-not-allowed
                  disabled:opacity-40 disabled:hover:scale-100
                  cursor-pointer active:scale-95
                "
              >
                <Icon name="arrow-up" size={15} />
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
