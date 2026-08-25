import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const VALID_THEME_COLORS = ["emerald", "indigo", "blue", "violet", "amber", "rose"];
const VALID_THEME_MODES = ["light", "dark", "system"];

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, user.id),
  });

  return NextResponse.json({
    themeColor: profile?.themeColor ?? "emerald",
    themeMode: profile?.themeMode ?? "system",
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { themeColor, themeMode } = body;

    const validatedColor =
      themeColor && VALID_THEME_COLORS.includes(themeColor)
        ? themeColor
        : "emerald";

    const validatedMode =
      themeMode && VALID_THEME_MODES.includes(themeMode)
        ? themeMode
        : "system";

    const existing = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });

    if (existing) {
      await db
        .update(schema.financialProfiles)
        .set({
          themeColor: validatedColor,
          themeMode: validatedMode,
          updatedAt: new Date(),
        })
        .where(eq(schema.financialProfiles.userId, user.id));
    } else {
      await db.insert(schema.financialProfiles).values({
        userId: user.id,
        monthlyIncome: 0,
        themeColor: validatedColor,
        themeMode: validatedMode,
      });
    }

    return NextResponse.json({
      success: true,
      themeColor: validatedColor,
      themeMode: validatedMode,
    });
  } catch (error) {
    console.error("Failed to update theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme settings" },
      { status: 500 },
    );
  }
}
