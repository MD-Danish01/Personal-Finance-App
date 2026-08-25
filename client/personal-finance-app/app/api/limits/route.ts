import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, sql } from "drizzle-orm";

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
] as const;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  // Get start and end of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // Fetch configured limits
  const userLimits = await db.query.limits.findMany({
    where: eq(schema.limits.userId, user.id),
  });

  const limitsMap = new Map(
    userLimits.map((l) => [l.category, l.monthlyLimit]),
  );

  // Fetch actual spending this month per category
  const spendingRows = await db
    .select({
      category: schema.transactions.category,
      totalSpent: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)::bigint`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, "expense"),
        sql`${schema.transactions.transactionDate} >= ${startOfMonth}`,
        sql`${schema.transactions.transactionDate} <= ${endOfMonth}`,
      ),
    )
    .groupBy(schema.transactions.category);

  const spendingMap = new Map(
    spendingRows.map((r) => [r.category, Number(r.totalSpent)]),
  );

  const results = CATEGORIES.map((cat) => {
    const limit = limitsMap.get(cat) ?? 0;
    const spent = spendingMap.get(cat) ?? 0;
    const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    let status: "not_set" | "ok" | "warning" | "exceeded" = "not_set";
    if (limit > 0) {
      if (percent >= 100) status = "exceeded";
      else if (percent >= 75) status = "warning";
      else status = "ok";
    }

    return {
      category: cat,
      monthlyLimit: limit,
      spentPaise: spent,
      percent,
      status,
    };
  });

  return NextResponse.json({ limits: results });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { category, monthlyLimit } = body;

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const limitPaise =
      typeof monthlyLimit === "number"
        ? Math.round(monthlyLimit * 100)
        : parseInt(monthlyLimit, 10);

    if (isNaN(limitPaise) || limitPaise < 0) {
      return NextResponse.json(
        { error: "Limit must be 0 or greater" },
        { status: 400 },
      );
    }

    const existing = await db.query.limits.findFirst({
      where: and(
        eq(schema.limits.userId, user.id),
        eq(schema.limits.category, category),
      ),
    });

    if (existing) {
      await db
        .update(schema.limits)
        .set({
          monthlyLimit: limitPaise,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.limits.userId, user.id),
            eq(schema.limits.category, category),
          ),
        );
    } else {
      await db.insert(schema.limits).values({
        userId: user.id,
        category,
        monthlyLimit: limitPaise,
      });
    }

    return NextResponse.json({ success: true, category, monthlyLimit: limitPaise });
  } catch (error) {
    console.error("Failed to update limit:", error);
    return NextResponse.json(
      { error: "Failed to save category limit" },
      { status: 500 },
    );
  }
}
