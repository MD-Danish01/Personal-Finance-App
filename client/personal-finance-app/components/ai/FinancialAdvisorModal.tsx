"use client";

import { useState, useRef, useEffect } from "react";
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-card-border shadow-2xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-card-border bg-card">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name="sparkles" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Financial Copilot</h2>
                <p className="text-[11px] text-muted">Grounded in your real cashflow & goals</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulatorOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted-bg hover:bg-card-border/40 text-[11px] font-bold text-primary transition-colors cursor-pointer border border-card-border"
              >
                <Icon name="calculator" size={13} />
                <span className="hidden sm:inline">Simulate</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted transition-colors cursor-pointer"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary text-xs font-bold mt-0.5">
                    <Icon name="sparkles" size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                      : "bg-muted-bg border border-card-border text-foreground rounded-tl-xs whitespace-pre-line"
                  }`}
                >
                  {msg.text}
                  <span
                    className={`block text-[9px] mt-1.5 opacity-60 ${
                      msg.sender === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start items-center text-xs text-muted">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary text-xs font-bold">
                  <Icon name="sparkles" size={14} />
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-muted-bg border border-card-border">
                  <Icon name="refresh-cw" size={13} className="animate-spin text-primary" />
                  <span>Analyzing your finances...</span>
                </div>
              </div>
            )}
          </div>

          {/* Starter Chips */}
          <div className="px-4 py-2 bg-card border-t border-card-border/60 flex items-center gap-1.5 overflow-x-auto">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-muted-bg border border-card-border text-[11px] font-medium text-muted hover:text-primary hover:border-primary transition-all shrink-0 cursor-pointer disabled:opacity-50 truncate max-w-[200px]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 border-t border-card-border bg-card flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your money, budget, or goals..."
              disabled={loading}
              className="flex-1 rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0 shadow-xs"
            >
              <Icon name="arrow-up" size={16} />
            </button>
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
