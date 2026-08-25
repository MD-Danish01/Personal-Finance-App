import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, user.id),
  });

  const monthlyIncome = profile?.monthlyIncome ?? 0;
  const essentialsPercent = profile?.essentialsPercent ?? 50;
  const targetMonths = profile?.emergencyMonthsTarget ?? 6;

  // Monthly essential expenditure estimation in paise
  const monthlyEssentialsPaise = Math.round(
    (monthlyIncome * essentialsPercent) / 100,
  );

  const calculatedTargetPaise = monthlyEssentialsPaise * targetMonths;

  let fund = await db.query.emergencyFunds.findFirst({
    where: eq(schema.emergencyFunds.userId, user.id),
  });

  if (!fund && calculatedTargetPaise > 0) {
    const [created] = await db
      .insert(schema.emergencyFunds)
      .values({
        userId: user.id,
        targetAmount: calculatedTargetPaise,
        currentAmount: 0,
      })
      .returning();
    fund = created;
  }

  const currentPaise = fund?.currentAmount ?? 0;
  const targetPaise = fund?.targetAmount || calculatedTargetPaise;

  const runwayMonths =
    monthlyEssentialsPaise > 0
      ? Number((currentPaise / monthlyEssentialsPaise).toFixed(1))
      : 0;

  const progressPercent =
    targetPaise > 0
      ? Math.min(Math.round((currentPaise / targetPaise) * 100), 100)
      : 0;

  return NextResponse.json({
    currentAmount: currentPaise,
    targetAmount: targetPaise,
    targetMonths,
    monthlyEssentials: monthlyEssentialsPaise,
    runwayMonths,
    progressPercent,
    shortfall: Math.max(0, targetPaise - currentPaise),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { action, amount } = body;

    const amountPaise =
      typeof amount === "number"
        ? Math.round(amount * 100)
        : parseInt(amount, 10);

    if (isNaN(amountPaise) || amountPaise < 0) {
      return NextResponse.json(
        { error: "Invalid amount provided" },
        { status: 400 },
      );
    }

    const existing = await db.query.emergencyFunds.findFirst({
      where: eq(schema.emergencyFunds.userId, user.id),
    });

    let updated;
    if (existing) {
      let newCurrent = existing.currentAmount;
      if (action === "deposit") newCurrent += amountPaise;
      else if (action === "withdraw")
        newCurrent = Math.max(0, newCurrent - amountPaise);
      else newCurrent = amountPaise; // set explicitly

      [updated] = await db
        .update(schema.emergencyFunds)
        .set({
          currentAmount: newCurrent,
          updatedAt: new Date(),
        })
        .where(eq(schema.emergencyFunds.userId, user.id))
        .returning();
    } else {
      [updated] = await db
        .insert(schema.emergencyFunds)
        .values({
          userId: user.id,
          targetAmount: amountPaise * 6,
          currentAmount: amountPaise,
        })
        .returning();
    }

    return NextResponse.json({ success: true, fund: updated });
  } catch (error) {
    console.error("Failed to update emergency fund:", error);
    return NextResponse.json(
      { error: "Failed to update emergency fund" },
      { status: 500 },
    );
  }
}
