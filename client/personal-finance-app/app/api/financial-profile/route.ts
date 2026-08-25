import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const profile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });

    if (!profile) {
      return NextResponse.json(null);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Failed to get financial profile:", error);
    return NextResponse.json(null);
  }
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { monthlyIncome } = body;

    const incomePaise =
      typeof monthlyIncome === "number"
        ? Math.round(monthlyIncome)
        : parseInt(monthlyIncome, 10);

    if (isNaN(incomePaise) || incomePaise <= 0) {
      return NextResponse.json(
        { error: "monthlyIncome must be a positive number (in paise)" },
        { status: 400 },
      );
    }

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const existing = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });

    const defaults = {
      essentialsPercent: 50,
      savingsPercent: 20,
      enjoymentPercent: 20,
      bufferPercent: 10,
      emergencyMonthsTarget: 6,
      themeColor: "emerald",
      themeMode: "system",
      onboardingCompleted: true,
    };

    let profileRecord;

    if (existing) {
      const [updated] = await db
        .update(schema.financialProfiles)
        .set({
          monthlyIncome: incomePaise,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.financialProfiles.id, existing.id))
        .returning();
      profileRecord = updated;
    } else {
      const [created] = await db
        .insert(schema.financialProfiles)
        .values({
          userId: user.id,
          monthlyIncome: incomePaise,
          ...defaults,
        })
        .returning();
      profileRecord = created;
    }

    // Synchronize or create the active plan for the current month with new income
    const activePlan = await db.query.plans.findFirst({
      where: and(
        eq(schema.plans.userId, user.id),
        eq(schema.plans.month, curMonth),
        eq(schema.plans.year, curYear),
      ),
    });

    const essentialsPercent = profileRecord.essentialsPercent || 50;
    const enjoymentPercent = profileRecord.enjoymentPercent || 20;
    const savingsPercent = profileRecord.savingsPercent || 20;
    const bufferPercent = profileRecord.bufferPercent || 10;

    if (activePlan) {
      // Update plan's monthlyIncome
      await db
        .update(schema.plans)
        .set({
          monthlyIncome: incomePaise,
          updatedAt: new Date(),
        })
        .where(eq(schema.plans.id, activePlan.id));

      // Recalculate allocations based on new income
      const existingAllocs = await db
        .select()
        .from(schema.planAllocations)
        .where(eq(schema.planAllocations.planId, activePlan.id));

      for (const alloc of existingAllocs) {
        await db
          .update(schema.planAllocations)
          .set({
            amount: Math.round((incomePaise * alloc.percent) / 100),
          })
          .where(eq(schema.planAllocations.id, alloc.id));
      }
    } else {
      // Create new plan if missing
      const [newPlan] = await db
        .insert(schema.plans)
        .values({
          userId: user.id,
          month: curMonth,
          year: curYear,
          monthlyIncome: incomePaise,
          status: "active",
          whyThisPlan:
            "Balanced plan designed to cover your needs, build safety, and grow wealth.",
        })
        .returning();

      const defaultKeys = [
        { key: "essentials" as const, percent: essentialsPercent },
        { key: "enjoyment" as const, percent: enjoymentPercent },
        { key: "emergency" as const, percent: Math.round(savingsPercent * 0.4) },
        { key: "future_savings" as const, percent: Math.round(savingsPercent * 0.4) },
        { key: "long_term_wealth" as const, percent: Math.round(savingsPercent * 0.2) },
        { key: "buffer" as const, percent: bufferPercent },
      ];

      for (const alloc of defaultKeys) {
        await db.insert(schema.planAllocations).values({
          planId: newPlan.id,
          key: alloc.key,
          amount: Math.round((incomePaise * alloc.percent) / 100),
          percent: alloc.percent,
        });
      }
    }

    // Update emergency funds target if emergency fund record exists
    const emergencyMonths = profileRecord.emergencyMonthsTarget || 6;
    const targetEmergencyCorpus = Math.round(
      incomePaise * (essentialsPercent / 100) * emergencyMonths,
    );

    const existingEmergency = await db.query.emergencyFunds.findFirst({
      where: eq(schema.emergencyFunds.userId, user.id),
    });

    if (existingEmergency) {
      await db
        .update(schema.emergencyFunds)
        .set({
          targetAmount: targetEmergencyCorpus,
          updatedAt: new Date(),
        })
        .where(eq(schema.emergencyFunds.id, existingEmergency.id));
    }

    return NextResponse.json(profileRecord, { status: 200 });
  } catch (error) {
    console.error("Failed to save financial profile:", error);
    return NextResponse.json(
      { error: "Failed to save income. Please try again." },
      { status: 500 },
    );
  }
}
