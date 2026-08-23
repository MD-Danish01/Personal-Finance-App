import { and, asc, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  isUniqueViolation,
  planCreateSchema,
  validationError,
} from "@/lib/plans";

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getPlansWithAllocations(userId: string) {
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
    .where(eq(schema.plans.userId, userId))
    .orderBy(desc(schema.plans.year), desc(schema.plans.month), desc(schema.plans.createdAt), asc(schema.planAllocations.id));

  return groupPlans(rows);
}

function groupPlans(
  rows: Array<{
    plan: typeof schema.plans["$inferSelect"];
    allocation: typeof schema.planAllocations["$inferSelect"] | null;
  }>,
) {
  const grouped = new Map<string, {
    plan: typeof schema.plans["$inferSelect"];
    allocations: Array<typeof schema.planAllocations["$inferSelect"]>;
  }>();

  for (const row of rows) {
    const current = grouped.get(row.plan.id) ?? {
      plan: row.plan,
      allocations: [],
    };
    if (row.allocation) current.allocations.push(row.allocation);
    grouped.set(row.plan.id, current);
  }

  return [...grouped.values()].map(({ plan, allocations }) => ({
    ...plan,
    allocations,
  }));
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ items: await getPlansWithAllocations(userId) });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = planCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { allocations, ...planData } = parsed.data;

    try {
      const plan = await db.transaction(async (tx) => {
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

        const [createdPlan] = await tx
          .insert(schema.plans)
          .values({ ...planData, userId })
          .returning();

        if (allocations?.length) {
          await tx.insert(schema.planAllocations).values(
            allocations.map((allocation) => ({
              ...allocation,
              planId: createdPlan.id,
            })),
          );
        }

        return createdPlan;
      });

      return Response.json(
        { ...plan, allocations: allocations ?? [] },
        { status: 201 },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Response.json(
          { error: "A plan already exists for that month and year" },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
