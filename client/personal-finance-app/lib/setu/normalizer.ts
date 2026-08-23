import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

type Category = "Food" | "Transport" | "Shopping" | "Entertainment" | "Bills" | "Others";

const MERCHANT_RULES: { keywords: string[]; category: Category }[] = [
  { keywords: ["swiggy", "zomato", "dominos", "mcdonald", "kfc", "foodpanda"], category: "Food" },
  { keywords: ["uber", "ola", "rapido", "metro", "fuel", "petrol", "indian oil", "bharat petroleum"], category: "Transport" },
  { keywords: ["amazon", "myntra", "flipkart", "zudio", "ajio", "lifestyle", "pantaloons"], category: "Shopping" },
  { keywords: ["netflix", "spotify", "hotstar", "prime", "sony", "bookmyshow"], category: "Entertainment" },
  { keywords: ["airtel", "jio", "vi ", "vodafone", "bsnl", "electricity", "water", "gas", "dth"], category: "Bills" },
];

export function classifyMerchant(description: string): Category {
  const text = (description || "").toLowerCase();
  for (const rule of MERCHANT_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.category;
    }
  }
  return "Others";
}

export function extractMerchant(description: string): string {
  const text = (description || "").trim();
  if (!text) return "Unknown";

  for (const rule of MERCHANT_RULES) {
    for (const kw of rule.keywords) {
      const idx = text.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        return text.slice(idx, idx + kw.length).replace(/^\w/, (c) => c.toUpperCase());
      }
    }
  }

  const parts = text.split(/[\s\-|@]+/);
  return parts[0].replace(/^\w/, (c) => c.toUpperCase()) || "Unknown";
}

interface NormalizedTransaction {
  userId: string;
  amount: number;
  type: "expense" | "income";
  category: Category;
  merchant: string;
  description: string | null;
  transactionDate: string;
  source: "ACCOUNT_AGGREGATOR";
  setuTransactionId: string | null;
}

interface RawFIRecord {
  amount?: string | number;
  type?: string;
  narration?: string;
  description?: string;
  transactionDate?: string;
  date?: string;
  transactionId?: string;
  id?: string;
  referenceNo?: string;
}

export function normalizeTransaction(
  raw: RawFIRecord,
  userId: string,
): NormalizedTransaction {
  const narration = raw.narration || raw.description || "";
  const rawAmount = parseFloat(String(raw.amount ?? "0"));
  const amountPaise = Math.round(Math.abs(rawAmount) * 100);

  const isDebit =
    (raw.type && raw.type.toUpperCase() === "DEBIT") || rawAmount < 0;

  return {
    userId,
    amount: amountPaise,
    type: isDebit ? "expense" : "income",
    category: classifyMerchant(narration),
    merchant: extractMerchant(narration),
    description: narration || null,
    transactionDate:
      raw.transactionDate || raw.date || new Date().toISOString().slice(0, 10),
    source: "ACCOUNT_AGGREGATOR",
    setuTransactionId: raw.transactionId || raw.id || raw.referenceNo || null,
  };
}

export function normalizeFIData(
  fiData: { data?: unknown; FI?: unknown; sessions?: unknown } | Record<string, unknown>,
  userId: string,
): NormalizedTransaction[] {
  const transactions: NormalizedTransaction[] = [];

  const extractFromNode = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    if (Array.isArray(obj.transactions)) {
      for (const tx of obj.transactions) {
        transactions.push(normalizeTransaction(tx as RawFIRecord, userId));
      }
    }
    if (Array.isArray(obj.data)) {
      for (const child of obj.data) {
        extractFromNode(child);
      }
    }
    if (obj.fipData && typeof obj.fipData === "object") {
      extractFromNode(obj.fipData);
    }
    if (obj.FI && Array.isArray(obj.FI)) {
      for (const child of obj.FI) {
        extractFromNode(child);
      }
    }
  };

  extractFromNode(fiData);

  return transactions;
}

export async function saveTransactions(txs: NormalizedTransaction[]) {
  if (txs.length === 0) return { inserted: 0 };

  let inserted = 0;
  for (const tx of txs) {
    if (!tx.setuTransactionId) continue;

    const existing = await db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(
        sql`${schema.transactions.setuTransactionId} = ${tx.setuTransactionId}`,
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(schema.transactions).values({
      userId: tx.userId,
      amount: tx.amount,
      type: tx.type,
      category: tx.category as typeof schema.transactions.$inferInsert.category,
      merchant: tx.merchant,
      description: tx.description,
      transactionDate: tx.transactionDate,
      source: "ACCOUNT_AGGREGATOR",
      setuTransactionId: tx.setuTransactionId,
    });
    inserted++;
  }

  return { inserted };
}
