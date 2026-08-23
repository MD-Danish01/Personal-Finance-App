import { and, asc, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        plan: schema.plans,
        allocation: schema.planAllocations,
      })
      .from(schema.plans)
      .leftJoin(
        schema.planAllocations,
        eq(schema.planAllocations.planId, schema.plans.id),
      )
      .where(
        and(
          eq(schema.plans.userId, session.user.id),
          eq(schema.plans.status, "active"),
        ),
      )
      .orderBy(desc(schema.plans.updatedAt), desc(schema.plans.createdAt), asc(schema.planAllocations.id));

    if (!rows.length) {
      return Response.json({ error: "Current plan not found" }, { status: 404 });
    }

    const currentPlanId = rows[0].plan.id;

    return Response.json({
      ...rows[0].plan,
      allocations: rows
        .filter((row) => row.plan.id === currentPlanId)
        .flatMap((row) => (row.allocation ? [row.allocation] : [])),
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
