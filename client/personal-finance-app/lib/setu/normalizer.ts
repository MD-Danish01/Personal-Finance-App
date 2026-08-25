import { db, schema } from "@/lib/db";
import { sql, eq, and } from "drizzle-orm";

type Category = "Food" | "Transport" | "Shopping" | "Entertainment" | "Bills" | "Others";

const MERCHANT_RULES: { keywords: string[]; category: Category }[] = [
  { keywords: ["swiggy", "zomato", "dominos", "mcdonald", "kfc", "foodpanda", "starbucks", "dunkin", "blinkit", "zepto", "instamart"], category: "Food" },
  { keywords: ["uber", "ola", "rapido", "metro", "fuel", "petrol", "indian oil", "bharat petroleum", "hpcl", "irctc", "makemytrip"], category: "Transport" },
  { keywords: ["amazon", "myntra", "flipkart", "zudio", "ajio", "lifestyle", "pantaloons", "nykaa", "tatacliq", "croma"], category: "Shopping" },
  { keywords: ["netflix", "spotify", "hotstar", "prime", "sony", "bookmyshow", "youtube", "pvr", "inox", "apple"], category: "Entertainment" },
  { keywords: ["airtel", "jio", "vi ", "vodafone", "bsnl", "electricity", "water", "gas", "dth", "bescom", "tneb", "mahadiscom", "rent", "recharge"], category: "Bills" },
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
  if (!text) return "Direct Transfer";

  for (const rule of MERCHANT_RULES) {
    for (const kw of rule.keywords) {
      const idx = text.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        return text.slice(idx, idx + kw.length).replace(/^\w/, (c) => c.toUpperCase());
      }
    }
  }

  const parts = text.split(/[\s\-|@/]+/);
  return parts[0].replace(/^\w/, (c) => c.toUpperCase()) || "General";
}

export interface NormalizedTransaction {
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

export interface DiscoveredAccount {
  userId: string;
  fipId: string;
  fipName: string;
  maskedAccountNumber: string;
  accountType: string;
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
): { transactions: NormalizedTransaction[]; accounts: DiscoveredAccount[] } {
  const transactions: NormalizedTransaction[] = [];
  const accounts: DiscoveredAccount[] = [];

  const extractFromNode = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    // Extract Account info if present
    if (obj.fipId || obj.fipName || obj.maskedAccNumber || obj.accountNumber) {
      const fipId = String(obj.fipId || obj.fip || "BANK");
      const fipName = String(obj.fipName || obj.bankName || fipId);
      const rawAcc = String(obj.maskedAccNumber || obj.accountNumber || obj.accNumber || "XXXX");
      const maskedAccountNumber = rawAcc.length > 4 ? `XXXX-${rawAcc.slice(-4)}` : rawAcc;
      const accountType = String(obj.accountType || obj.type || "DEPOSIT");

      if (!accounts.some((a) => a.maskedAccountNumber === maskedAccountNumber && a.fipId === fipId)) {
        accounts.push({
          userId,
          fipId,
          fipName,
          maskedAccountNumber,
          accountType,
        });
      }
    }

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

  return { transactions, accounts };
}

export async function saveAccounts(accounts: DiscoveredAccount[]) {
  if (accounts.length === 0) return { inserted: 0 };
  let inserted = 0;

  for (const acc of accounts) {
    const existing = await db.query.connectedFinancialAccounts.findFirst({
      where: and(
        eq(schema.connectedFinancialAccounts.userId, acc.userId),
        eq(schema.connectedFinancialAccounts.fipId, acc.fipId),
        eq(schema.connectedFinancialAccounts.maskedAccountNumber, acc.maskedAccountNumber),
      ),
    });

    if (!existing) {
      await db.insert(schema.connectedFinancialAccounts).values({
        userId: acc.userId,
        fipId: acc.fipId,
        fipName: acc.fipName,
        maskedAccountNumber: acc.maskedAccountNumber,
        accountType: acc.accountType,
      });
      inserted++;
    }
  }

  return { inserted };
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
