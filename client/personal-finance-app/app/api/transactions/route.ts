import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, desc } from "drizzle-orm";
import { computeRelativeDate } from "@/lib/constants";

const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
] as const;

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  const rows = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, user.id))
    .orderBy(desc(schema.transactions.transactionDate), desc(schema.transactions.createdAt))
    .limit(limit);

  const items = rows.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    merchant: tx.merchant,
    description: tx.description ?? undefined,
    transactionDate: tx.transactionDate,
    source: tx.source,
    relativeDate: computeRelativeDate(tx.transactionDate),
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { amount, type = "expense", category = "Others", merchant, description, transactionDate } = body;

    // Amount comes in INR (or paise). If number is float/standard INR, convert to integer paise
    const parsedAmount = typeof amount === "number" ? Math.round(amount * 100) : parseInt(amount, 10);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount. Must be greater than 0." }, { status: 400 });
    }

    const validatedType = type === "income" ? "income" : "expense";
    const validatedCategory = VALID_CATEGORIES.includes(category) ? category : "Others";
    const validatedMerchant = (merchant || (validatedType === "income" ? "Salary / Credit" : "General Expense")).trim();
    const validatedDate = transactionDate || new Date().toISOString().slice(0, 10);

    const [inserted] = await db
      .insert(schema.transactions)
      .values({
        userId: user.id,
        amount: parsedAmount,
        type: validatedType,
        category: validatedCategory,
        merchant: validatedMerchant,
        description: description?.trim() || null,
        transactionDate: validatedDate,
        source: "MANUAL",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        transaction: {
          id: inserted.id,
          amount: inserted.amount,
          type: inserted.type,
          category: inserted.category,
          merchant: inserted.merchant,
          description: inserted.description ?? undefined,
          transactionDate: inserted.transactionDate,
          source: inserted.source,
          relativeDate: computeRelativeDate(inserted.transactionDate),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
  }
}
