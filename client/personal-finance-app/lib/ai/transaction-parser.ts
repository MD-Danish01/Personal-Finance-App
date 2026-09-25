import { callWatsonxGranite } from "./watsonx";
import type { Category, TransactionType } from "../types";

export interface ParsedTransactionResult {
  amount: number;
  category: Category;
  type: TransactionType;
  merchant: string;
  description: string;
  confidence: number;
  source: "rule" | "ai";
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Food: [
    "swiggy", "zomato", "restaurant", "dinner", "lunch", "breakfast", "food",
    "coffee", "starbucks", "mcdonalds", "burger", "pizza", "dominos", "cafe",
    "chai", "tea", "dhaba", "groceries", "blinkit", "zepto", "instamart",
    "ration", "vegetables", "fruits", "biryani", "supermarket"
  ],
  Transport: [
    "uber", "ola", "rapido", "metro", "auto", "cab", "taxi", "bus", "train",
    "irctc", "flight", "petrol", "fuel", "diesel", "parking", "toll", "fastag"
  ],
  Shopping: [
    "amazon", "flipkart", "myntra", "meesho", "zara", "h&m", "clothes",
    "shoes", "electronics", "gadget", "shopping", "mall", "nykaa", "ajio"
  ],
  Entertainment: [
    "movie", "pvr", "inox", "cinema", "netflix", "spotify", "prime video",
    "hotstar", "game", "steam", "concert", "outing", "pub", "club", "party"
  ],
  Bills: [
    "electricity", "bijli", "water", "rent", "wifi", "broadband", "mobile",
    "recharge", "airtel", "jio", "vi", "maintenance", "gas", "cylinder", "lpg", "emi", "loan"
  ],
  Others: [
    "medical", "medicine", "doctor", "pharmacy", "hospital", "gym", "donation",
    "fees", "insurance", "investment"
  ],
};

const INCOME_KEYWORDS = [
  "salary", "credited", "received", "freelance", "dividend", "cashback",
  "refund", "interest", "bonus", "stipend", "payment received"
];

/**
 * Fast deterministic parser for Indian and global financial transactions.
 * Extracts amounts, merchants, types, and categories in < 1ms.
 */
export function parseTransactionRuleBased(text: string): ParsedTransactionResult | null {
  const clean = text.trim();
  if (!clean) return null;

  const lower = clean.toLowerCase();

  // 1. Extract Amount
  // Matches patterns like "450", "₹450", "rs 450", "inr 450", "450 rs", "450 rupees", "450k", "1.5k"
  const amountMatch =
    lower.match(/(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?))|(?:([\d,]+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees|bucks)?)/i);

  let amount = 0;
  if (amountMatch) {
    // Find first non-empty capturing group
    const rawVal = amountMatch[1] || amountMatch[2];
    if (rawVal) {
      const num = parseFloat(rawVal.replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        amount = num;
      }
    }
  }

  // Also check multiplier "k" (e.g. 15k -> 15000)
  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch && kMatch[1]) {
    const kNum = parseFloat(kMatch[1]) * 1000;
    if (!isNaN(kNum) && kNum > 0) {
      amount = kNum;
    }
  }

  if (amount <= 0) {
    return null; // Cannot reliably parse without an amount
  }

  // 2. Detect Type (Income vs Expense)
  const isIncome = INCOME_KEYWORDS.some((kw) => lower.includes(kw));
  const type: TransactionType = isIncome ? "income" : "expense";

  // 3. Detect Category
  let category: Category = isIncome ? "Others" : "Others";
  let matchedKeyword = "";

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        category = cat;
        matchedKeyword = kw;
        break;
      }
    }
    if (matchedKeyword) break;
  }

  // 4. Detect Merchant / Recipient
  let merchant = "";
  if (isIncome) {
    merchant = lower.includes("salary")
      ? "Monthly Salary"
      : lower.includes("freelance")
      ? "Freelance Client"
      : "Payment Received";
  } else if (matchedKeyword) {
    // Capitalize matched keyword as merchant if applicable
    merchant = matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1);
  } else {
    merchant = "General Expense";
  }

  return {
    amount,
    category,
    type,
    merchant,
    description: clean,
    confidence: matchedKeyword ? 0.95 : 0.75,
    source: "rule",
  };
}

/**
 * Hybrid Parser: Tries lightning-fast local rule parser first.
 * If ambiguous or confidence < 0.8, falls back to IBM watsonx Granite.
 */
export async function parseNaturalLanguageTransaction(
  text: string,
): Promise<ParsedTransactionResult> {
  const ruleResult = parseTransactionRuleBased(text);
  if (ruleResult && ruleResult.confidence >= 0.85) {
    return ruleResult;
  }

  // If rule match was partial or missing, use Watsonx Granite AI
  try {
    const prompt = `
You are an AI financial transaction parser.
Extract the transaction details from this user input: "${text}"

Respond ONLY with a valid JSON object matching this schema, with no markdown fences, no explanation:
{
  "amount": <number>,
  "category": "<Food | Transport | Shopping | Entertainment | Bills | Others>",
  "type": "<expense | income>",
  "merchant": "<merchant name or recipient>",
  "description": "<short description>"
}
    `.trim();

    const aiResponse = await callWatsonxGranite(prompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.amount && !isNaN(Number(parsed.amount))) {
        return {
          amount: Number(parsed.amount),
          category: parsed.category || "Others",
          type: parsed.type === "income" ? "income" : "expense",
          merchant: parsed.merchant || "Expense",
          description: parsed.description || text,
          confidence: 0.98,
          source: "ai",
        };
      }
    }
  } catch (error) {
    console.warn("AI parsing fallback failed, using rule-based result:", error);
  }

  return (
    ruleResult || {
      amount: 100,
      category: "Others",
      type: "expense",
      merchant: "Expense",
      description: text,
      confidence: 0.5,
      source: "rule",
    }
  );
}
