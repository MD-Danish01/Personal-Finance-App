import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function ensureUserProfileAndPlan(userId: string) {
  try {
    const initialIncomePaise = 5000000; // ₹50,000 baseline (in paise)

    // 1. Ensure financial profile
    const existingProfile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, userId),
    });

    if (!existingProfile) {
      await db
        .insert(schema.financialProfiles)
        .values({
          userId,
          monthlyIncome: initialIncomePaise,
          currency: "INR",
          essentialsPercent: 50,
          savingsPercent: 20,
          enjoymentPercent: 20,
          bufferPercent: 10,
          themeColor: "emerald",
          themeMode: "system",
          onboardingCompleted: true,
        })
        .onConflictDoNothing();
    }

    // 2. Ensure emergency fund
    const existingEmergencyFund = await db.query.emergencyFunds.findFirst({
      where: eq(schema.emergencyFunds.userId, userId),
    });

    if (!existingEmergencyFund) {
      await db
        .insert(schema.emergencyFunds)
        .values({
          userId,
          targetAmount: initialIncomePaise * 3, // 3 months baseline
          currentAmount: 0,
        })
        .onConflictDoNothing();
    }

    // 3. Ensure current month plan
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const existingPlan = await db.query.plans.findFirst({
      where: (plans, { and, eq: eqOp }) =>
        and(
          eqOp(plans.userId, userId),
          eqOp(plans.month, curMonth),
          eqOp(plans.year, curYear),
        ),
    });

    if (!existingPlan) {
      const [plan] = await db
        .insert(schema.plans)
        .values({
          userId,
          month: curMonth,
          year: curYear,
          monthlyIncome: initialIncomePaise,
          status: "active",
        })
        .returning();

      if (plan) {
        await db.insert(schema.planAllocations).values([
          {
            planId: plan.id,
            key: "essentials",
            percent: 50,
            amount: Math.round(initialIncomePaise * 0.5),
          },
          {
            planId: plan.id,
            key: "future_savings",
            percent: 20,
            amount: Math.round(initialIncomePaise * 0.2),
          },
          {
            planId: plan.id,
            key: "enjoyment",
            percent: 20,
            amount: Math.round(initialIncomePaise * 0.2),
          },
          {
            planId: plan.id,
            key: "buffer",
            percent: 10,
            amount: Math.round(initialIncomePaise * 0.1),
          },
        ]);
      }
    }
  } catch (error) {
    console.error("Error in ensureUserProfileAndPlan:", error);
  }
}
