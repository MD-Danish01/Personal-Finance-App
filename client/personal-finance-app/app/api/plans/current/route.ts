import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and } from "drizzle-orm";
import {
  ALLOCATION_LABELS,
  ALLOCATION_COLORS,
  ALLOCATION_BG,
  ALLOCATION_ICONS,
  MONTH_NAMES,
} from "@/lib/constants";
import type { PlanAllocation, Plan } from "@/lib/types";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.userId, user.id),
      eq(schema.plans.month, month),
      eq(schema.plans.year, year),
    ),
  });

  if (!plan) {
    const profile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });

    if (!profile) {
      return Response.json(
        { error: "No financial profile found. Please set your monthly income." },
        { status: 404 },
      );
    }

    const income = profile.monthlyIncome;
    const keys = [
      "essentials",
      "enjoyment",
      "emergency",
      "future_savings",
      "long_term_wealth",
      "buffer",
    ] as const;

    const percentMap: Record<string, number> = {
      essentials: profile.essentialsPercent,
      enjoyment: profile.enjoymentPercent,
      emergency: Math.round(profile.savingsPercent * 0.4),
      future_savings: Math.round(profile.savingsPercent * 0.4),
      long_term_wealth: Math.round(profile.savingsPercent * 0.2),
      buffer: profile.bufferPercent,
    };

    const [newPlan] = await db
      .insert(schema.plans)
      .values({
        userId: user.id,
        month,
        year,
        monthlyIncome: income,
        status: "active",
        whyThisPlan:
          "This plan is designed to cover your needs, build safety, achieve your goals and help you grow in the long run.",
      })
      .returning();
    plan = newPlan;

    const allocations = keys.map((key) => ({
      planId: plan!.id,
      key,
      amount: Math.round((income * percentMap[key]) / 100),
      percent: percentMap[key],
    }));

    await db.insert(schema.planAllocations).values(allocations);
  }

  const dbAllocations = await db
    .select()
    .from(schema.planAllocations)
    .where(eq(schema.planAllocations.planId, plan.id));

  const allocations: PlanAllocation[] = dbAllocations.map((a) => ({
    key: a.key as PlanAllocation["key"],
    label: ALLOCATION_LABELS[a.key as keyof typeof ALLOCATION_LABELS],
    amount: a.amount,
    percent: a.percent,
    colorClass: ALLOCATION_COLORS[a.key as keyof typeof ALLOCATION_COLORS],
    bgClass: ALLOCATION_BG[a.key as keyof typeof ALLOCATION_BG],
    iconKey: ALLOCATION_ICONS[a.key as keyof typeof ALLOCATION_ICONS],
  }));

  const result: Plan = {
    id: plan.id,
    month: MONTH_NAMES[plan.month - 1],
    year: plan.year,
    monthlyIncome: plan.monthlyIncome,
    status: plan.status as Plan["status"],
    allocations,
    whyThisPlan: plan.whyThisPlan ?? "",
  };

  return Response.json(result);
}
