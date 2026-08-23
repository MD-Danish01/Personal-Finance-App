import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  planIdSchema,
  planUpdateSchema,
  validationError,
} from "@/lib/plans";

type RouteContext = { params: Promise<{ id: string }> };

async function getPlanId(context: RouteContext) {
  const { id } = await context.params;
  return planIdSchema.safeParse(id);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const parsedId = await getPlanId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = planUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { allocations: inputAllocations, ...planData } = parsed.data;

    const plan = await db.transaction(async (tx) => {
      const [existingPlan] = await tx
        .select({ id: schema.plans.id })
        .from(schema.plans)
        .where(
          and(
            eq(schema.plans.id, parsedId.data),
            eq(schema.plans.userId, userId),
          ),
        )
        .limit(1);

      if (!existingPlan) return null;

      if (planData.status === "active") {
        await tx
          .update(schema.plans)
          .set({ status: "draft", updatedAt: new Date() })
          .where(
            and(
              eq(schema.plans.userId, userId),
              eq(schema.plans.status, "active"),
            ),
          );
      }

      const [updatedPlan] = await tx
        .update(schema.plans)
        .set({ ...planData, updatedAt: new Date() })
        .where(eq(schema.plans.id, existingPlan.id))
        .returning();

      if (inputAllocations !== undefined) {
        await tx
          .delete(schema.planAllocations)
          .where(eq(schema.planAllocations.planId, existingPlan.id));
        if (inputAllocations.length) {
          await tx.insert(schema.planAllocations).values(
            inputAllocations.map((allocation) => ({
              ...allocation,
              planId: existingPlan.id,
            })),
          );
        }
      }

      return updatedPlan;
    });

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    const allocations = await db
      .select()
      .from(schema.planAllocations)
      .where(eq(schema.planAllocations.planId, plan.id));

    return Response.json({ ...plan, allocations });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return Response.json(
        { error: "A plan already exists for that month and year" },
        { status: 409 },
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = await getPlanId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const [deletedPlan] = await db
      .delete(schema.plans)
      .where(
        and(
          eq(schema.plans.id, parsedId.data),
          eq(schema.plans.userId, session.user.id),
        ),
      )
      .returning({ id: schema.plans.id });

    if (!deletedPlan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
