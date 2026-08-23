import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { planIdSchema } from "@/lib/plans";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = await context.params;
    const parsedId = planIdSchema.safeParse(id);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const plan = await db.transaction(async (tx) => {
      const [ownedPlan] = await tx
        .select()
        .from(schema.plans)
        .where(
          and(
            eq(schema.plans.id, parsedId.data),
            eq(schema.plans.userId, userId),
          ),
        )
        .limit(1);

      if (!ownedPlan) return null;

      await tx
        .update(schema.plans)
        .set({ status: "draft", updatedAt: new Date() })
        .where(
          and(
            eq(schema.plans.userId, userId),
            eq(schema.plans.status, "active"),
          ),
        );

      const [activatedPlan] = await tx
        .update(schema.plans)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(schema.plans.id, ownedPlan.id))
        .returning();

      return activatedPlan;
    });

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    const allocations = await db
      .select()
      .from(schema.planAllocations)
      .where(eq(schema.planAllocations.planId, plan.id));

    return Response.json({ ...plan, allocations });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
