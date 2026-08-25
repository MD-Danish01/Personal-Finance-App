import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  ALLOCATION_LABELS,
  ALLOCATION_COLORS,
} from "@/lib/constants";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, "0");

    const startStr = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${pad(month)}-${pad(lastDay)}`;

    const profile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });
    const monthlyIncome = profile?.monthlyIncome ?? 0;

    let plan = await db.query.plans.findFirst({
      where: and(
        eq(schema.plans.userId, user.id),
        eq(schema.plans.month, month),
        eq(schema.plans.year, year),
      ),
    });

    // If profile exists with income but plan is missing for this month, auto-create plan
    if (!plan && monthlyIncome > 0 && profile) {
      const [newPlan] = await db
        .insert(schema.plans)
        .values({
          userId: user.id,
          month,
          year,
          monthlyIncome,
          status: "active",
          whyThisPlan:
            "Balanced plan designed to secure essentials and systematically grow savings.",
        })
        .returning();
      plan = newPlan;

      const defaultKeys = [
        { key: "essentials" as const, percent: profile.essentialsPercent },
        { key: "enjoyment" as const, percent: profile.enjoymentPercent },
        { key: "emergency" as const, percent: Math.round(profile.savingsPercent * 0.4) },
        { key: "future_savings" as const, percent: Math.round(profile.savingsPercent * 0.4) },
        { key: "long_term_wealth" as const, percent: Math.round(profile.savingsPercent * 0.2) },
        { key: "buffer" as const, percent: profile.bufferPercent },
      ];

      for (const alloc of defaultKeys) {
        await db.insert(schema.planAllocations).values({
          planId: plan.id,
          key: alloc.key,
          amount: Math.round((monthlyIncome * alloc.percent) / 100),
          percent: alloc.percent,
        });
      }
    }

    let allocations: { key: string; amount: number; percent: number }[] = [];
    if (plan) {
      allocations = await db
        .select({
          key: schema.planAllocations.key,
          amount: schema.planAllocations.amount,
          percent: schema.planAllocations.percent,
        })
        .from(schema.planAllocations)
        .where(eq(schema.planAllocations.planId, plan.id));
    }

    const categoryRows = await db
      .select({
        category: schema.transactions.category,
        total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.transactionDate, startStr),
          lte(schema.transactions.transactionDate, endStr),
        ),
      )
      .groupBy(schema.transactions.category);

    const spentByCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      spentByCategory[row.category] = Number(row.total);
    }

    const monthSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
    const monthBudget = plan?.monthlyIncome ?? monthlyIncome;

    const daysInMonth = lastDay;
    const dayOfMonth = now.getDate();
    const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);

    const safeToSpend =
      monthBudget > 0
        ? Math.max(0, Math.round((monthBudget - monthSpent) / remainingDays / 100))
        : 0;

    const goals = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.userId, user.id))
      .orderBy(desc(schema.goals.createdAt));

    const topGoal = goals[0]
      ? {
          name: goals[0].name,
          icon: goals[0].icon,
          current: goals[0].currentAmount,
          target: goals[0].targetAmount,
          colorClass: "bg-primary",
        }
      : null;

    // Approximate category mapping to allocation buckets:
    // Essentials: Bills + Transport + 50% Food
    // Enjoyment: Shopping + Entertainment + 50% Food
    const essentialsSpent =
      (spentByCategory["Bills"] || 0) +
      (spentByCategory["Transport"] || 0) +
      Math.round((spentByCategory["Food"] || 0) * 0.5);

    const enjoymentSpent =
      (spentByCategory["Shopping"] || 0) +
      (spentByCategory["Entertainment"] || 0) +
      Math.round((spentByCategory["Food"] || 0) * 0.5);

    const overview = allocations.map((a) => {
      let spent = 0;
      if (a.key === "essentials") spent = essentialsSpent;
      else if (a.key === "enjoyment") spent = enjoymentSpent;
      else if (a.key === "buffer") spent = spentByCategory["Others"] || 0;

      return {
        label: ALLOCATION_LABELS[a.key as keyof typeof ALLOCATION_LABELS] ?? a.key,
        amount: Math.round(spent / 100),
        of: Math.round(a.amount / 100),
        colorClass: ALLOCATION_COLORS[a.key as keyof typeof ALLOCATION_COLORS] ?? "bg-primary",
      };
    });

    let insightText = "You're on track with your spending plan.";
    let insightTone: "positive" | "warning" | "info" = "info";

    if (monthBudget > 0) {
      if (monthSpent < monthBudget * 0.7) {
        insightText = `You're ₹${Math.round(
          (monthBudget - monthSpent) / 100,
        ).toLocaleString("en-IN")} ahead of your spending plan. Great job!`;
        insightTone = "positive";
      } else if (monthSpent > monthBudget) {
        insightText = `You've exceeded your monthly budget by ₹${Math.round(
          (monthSpent - monthBudget) / 100,
        ).toLocaleString("en-IN")}. Consider adjusting discretionary expenses.`;
        insightTone = "warning";
      }
    }

    return NextResponse.json({
      greetingName: user.name?.split(" ")[0] || "Friend",
      safeToSpendToday: safeToSpend,
      safeToSpendSubtitle: "Safe daily limit for remaining days",
      monthSpent: Math.round(monthSpent / 100),
      monthBudget: Math.round(monthBudget / 100),
      overview,
      topGoal,
      insight: { text: insightText, tone: insightTone },
    });
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    return NextResponse.json({
      greetingName: user.name?.split(" ")[0] || "Friend",
      safeToSpendToday: 0,
      safeToSpendSubtitle: "Set income in Profile to activate Safe-to-Spend",
      monthSpent: 0,
      monthBudget: 0,
      overview: [],
      topGoal: null,
      insight: {
        text: "Set up your financial profile to receive personalized daily recommendations.",
        tone: "info",
      },
    });
  }
}
