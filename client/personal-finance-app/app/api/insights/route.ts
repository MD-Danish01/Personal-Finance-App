import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [thisMonthRow] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)` })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.transactionDate, fmt(thisMonthStart)),
        lte(schema.transactions.transactionDate, fmt(thisMonthEnd)),
      ),
    );

  const [lastMonthRow] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)` })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.transactionDate, fmt(lastMonthStart)),
        lte(schema.transactions.transactionDate, fmt(lastMonthEnd)),
      ),
    );

  const thisMonthSpent = Number(thisMonthRow?.total ?? 0);
  const lastMonthSpent = Number(lastMonthRow?.total ?? 0);

  const trend =
    lastMonthSpent > 0
      ? Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100)
      : 0;

  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, user.id),
  });
  const income = profile?.monthlyIncome ?? 0;
  const savingsRate =
    income > 0 ? Math.round(((income - thisMonthSpent) / income) * 100) : 0;

  const storedInsights = await db
    .select()
    .from(schema.insights)
    .where(eq(schema.insights.userId, user.id))
    .orderBy(desc(schema.insights.generatedAt))
    .limit(5);

  return Response.json({
    spendingTrend: { value: trend, vsLabel: "vs last month" },
    savingsRate: {
      value: savingsRate,
      label: savingsRate >= 20 ? "Good" : savingsRate >= 10 ? "Fair" : "Needs work",
    },
    items: storedInsights.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      tone: i.tone,
    })),
  });
}
