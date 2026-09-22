"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { Category, Transaction } from "@/lib/types";

interface EditTransactionModalProps {
  open: boolean;
  transaction: (Transaction & { relativeDate: string }) | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES: {
  id: Category;
  label: string;
  icon: IconName;
  colorClass: string;
}[] = [
  { id: "Food", label: "Food", icon: "utensils", colorClass: "text-amber-500 bg-amber-500/10" },
  { id: "Transport", label: "Transport", icon: "car", colorClass: "text-blue-500 bg-blue-500/10" },
  { id: "Shopping", label: "Shopping", icon: "shopping-bag", colorClass: "text-purple-500 bg-purple-500/10" },
  { id: "Entertainment", label: "Fun", icon: "film", colorClass: "text-rose-500 bg-rose-500/10" },
  { id: "Bills", label: "Bills", icon: "receipt", colorClass: "text-emerald-500 bg-emerald-500/10" },
  { id: "Others", label: "Others", icon: "wallet", colorClass: "text-slate-500 bg-slate-500/10" },
];

export function EditTransactionModal({
  open,
  transaction,
  onClose,
  onSaved,
}: EditTransactionModalProps) {
  if (!open || !transaction) return null;

  return (
    <EditTransactionForm
      key={transaction.id}
      transaction={transaction}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function EditTransactionForm({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: Transaction & { relativeDate: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  // amount is stored in paise — convert back to rupees for initial display
  const [type, setType] = useState<"expense" | "income">(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount / 100));
  const [category, setCategory] = useState<Category>(transaction.category);
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [description, setDescription] = useState(transaction.description ?? "");
  const [date, setDate] = useState(transaction.transactionDate);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transaction.id,
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
        throw new Error(data.error || "Failed to update transaction");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleteLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(transaction.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete transaction");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction");
      setConfirmDelete(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-card-border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name="pencil" size={16} />
            </div>
            <h2 className="text-base font-bold text-foreground">Edit Transaction</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted transition-colors cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

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

        <form onSubmit={handleSave} className="space-y-4">
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
          </div>

          {/* Category picker (only for expenses) */}
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

          {/* Merchant / Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                {type === "expense" ? "Merchant / Payee" : "Source"}
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder={type === "expense" ? "e.g. Swiggy, Uber" : "e.g. Salary"}
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

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                confirmDelete
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-card border border-card-border text-red-500 hover:bg-red-500/10"
              }`}
            >
              {deleteLoading ? "Deleting…" : confirmDelete ? "Confirm Delete" : "Delete"}
            </button>

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
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
