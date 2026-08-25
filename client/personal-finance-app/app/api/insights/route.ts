import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");

    // This month range
    const thisMonthStart = `${curYear}-${pad(curMonth)}-01`;
    const thisMonthLastDay = new Date(curYear, curMonth, 0).getDate();
    const thisMonthEnd = `${curYear}-${pad(curMonth)}-${pad(thisMonthLastDay)}`;

    // Last month range
    const lastMonthDate = new Date(curYear, curMonth - 2, 1);
    const lastYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthStart = `${lastYear}-${pad(lastMonth)}-01`;
    const lastMonthLastDay = new Date(lastYear, lastMonth, 0).getDate();
    const lastMonthEnd = `${lastYear}-${pad(lastMonth)}-${pad(lastMonthLastDay)}`;

    const [thisMonthRow] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)` })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.transactionDate, thisMonthStart),
          lte(schema.transactions.transactionDate, thisMonthEnd),
        ),
      );

    const [lastMonthRow] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)` })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.transactionDate, lastMonthStart),
          lte(schema.transactions.transactionDate, lastMonthEnd),
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
      income > 0 ? Math.max(0, Math.round(((income - thisMonthSpent) / income) * 100)) : 0;

    const storedInsights = await db
      .select()
      .from(schema.insights)
      .where(eq(schema.insights.userId, user.id))
      .orderBy(desc(schema.insights.generatedAt))
      .limit(5);

    let items = storedInsights.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      tone: i.tone,
    }));

    // If no stored insights exist, provide dynamic behavioral insights based on actual user state
    if (items.length === 0) {
      const generated = [];

      if (income === 0) {
        generated.push({
          id: "setup-income",
          title: "Setup Baseline Income",
          description:
            "Add your monthly take-home income in Profile to activate intelligent cashflow tracking and savings projections.",
          tone: "info" as const,
        });
      } else if (savingsRate >= 20) {
        generated.push({
          id: "high-savings",
          title: "Healthy Savings Momentum",
          description: `You're currently retaining ${savingsRate}% of your income. Consider allocating surplus into your emergency corpus or long-term investments.`,
          tone: "positive" as const,
        });
      } else if (thisMonthSpent > income) {
        generated.push({
          id: "budget-alert",
          title: "Spending Warning",
          description:
            "Your monthly expenses have crossed your income baseline. Review recent discretionary spending to stabilize cashflow.",
          tone: "warning" as const,
        });
      } else {
        generated.push({
          id: "savings-track",
          title: "Steady Progress",
          description: `You have saved ${savingsRate}% of your monthly income so far this period.`,
          tone: "info" as const,
        });
      }

      generated.push({
        id: "aa-connect",
        title: "Bank Account Sync",
        description:
          "Connect your bank via Setu Account Aggregator to automatically capture and categorize your UPI and card transactions.",
        tone: "info" as const,
      });

      items = generated;
    }

    return NextResponse.json({
      spendingTrend: {
        value: trend,
        vsLabel: lastMonthSpent > 0 ? "vs last month" : "baseline month",
      },
      savingsRate: {
        value: savingsRate,
        label: savingsRate >= 20 ? "Optimal" : savingsRate >= 10 ? "Fair" : "Needs Work",
      },
      items,
    });
  } catch (error) {
    console.error("Failed to fetch insights:", error);
    return NextResponse.json({
      spendingTrend: { value: 0, vsLabel: "baseline" },
      savingsRate: { value: 0, label: "Setup Profile" },
      items: [
        {
          id: "fallback-setup",
          title: "Welcome to Personal Finance",
          description: "Record your expenses and configure your income to generate automated financial insights.",
          tone: "info",
        },
      ],
    });
  }
}
