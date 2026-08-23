import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { and, eq } from "drizzle-orm";

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const allocations = body.allocations as { key: string; percent: number }[];

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return Response.json({ error: "allocations are required" }, { status: 400 });
  }

  const total = allocations.reduce((sum, item) => sum + Number(item.percent), 0);
  if (total !== 100 || allocations.some((item) => item.percent < 0 || item.percent > 100)) {
    return Response.json({ error: "Allocation percentages must total 100" }, { status: 400 });
  }

  const now = new Date();
  const plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.userId, user.id),
      eq(schema.plans.month, now.getMonth() + 1),
      eq(schema.plans.year, now.getFullYear()),
    ),
  });

  if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });

  for (const allocation of allocations) {
    const percent = Number(allocation.percent);
    await db
      .update(schema.planAllocations)
      .set({
        percent,
        amount: Math.round((plan.monthlyIncome * percent) / 100),
      })
      .where(
        and(
          eq(schema.planAllocations.planId, plan.id),
          eq(schema.planAllocations.key, allocation.key as never),
        ),
      );
  }

  const updated = await db
    .select()
    .from(schema.planAllocations)
    .where(eq(schema.planAllocations.planId, plan.id));

  return Response.json({ allocations: updated });
}
