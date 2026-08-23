import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, user.id),
  });

  if (!profile) {
    return Response.json(null);
  }

  return Response.json(profile);
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { monthlyIncome } = body;

  if (!monthlyIncome || monthlyIncome <= 0) {
    return Response.json(
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
  };

  if (existing) {
    const [updated] = await db
      .update(schema.financialProfiles)
      .set({ monthlyIncome, updatedAt: new Date() })
      .where(eq(schema.financialProfiles.id, existing.id))
      .returning();
    return Response.json(updated);
  }

  const [created] = await db
    .insert(schema.financialProfiles)
    .values({
      userId: user.id,
      monthlyIncome,
      ...defaults,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
