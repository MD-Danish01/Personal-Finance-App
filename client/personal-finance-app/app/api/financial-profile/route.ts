import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";

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
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(schema.financialProfiles)
      .values({
        userId: user.id,
        monthlyIncome: incomePaise,
        ...defaults,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to save financial profile:", error);
    return NextResponse.json(
      { error: "Failed to save income. Please try again." },
      { status: 500 },
    );
  }
}
