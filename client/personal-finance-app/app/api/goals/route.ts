import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, like } from "drizzle-orm";
import {
  processMonthlyGoalAutoAllocations,
  validateGoalTarget,
} from "@/lib/goals-engine";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    // 1. Run automated monthly allocations if due for this month
    await processMonthlyGoalAutoAllocations(user.id);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthTag = `[AUTO_MONTHLY] ${year}-${pad(month)}`;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 2. Fetch all user goals
    const rows = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.userId, user.id));

    // 3. Check which goals have an automated allocation this month
    const autoAllocContribs = await db
      .select({ goalId: schema.goalContributions.goalId })
      .from(schema.goalContributions)
      .where(
        and(
          gte(schema.goalContributions.contributedAt, startOfMonth),
          lte(schema.goalContributions.contributedAt, endOfMonth),
          like(schema.goalContributions.note, `${monthTag}%`),
        ),
      );

    const autoAllocatedGoalIds = new Set(
      autoAllocContribs.map((c) => c.goalId),
    );

    const enrichedRows = rows.map((goal) => ({
      ...goal,
      autoAllocatedThisMonth: autoAllocatedGoalIds.has(goal.id),
    }));

    return Response.json(enrichedRows);
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return Response.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { name, icon, targetAmount, deadline, monthlyTarget } = body;

    if (!name || targetAmount === undefined) {
      return Response.json(
        { error: "name and targetAmount are required" },
        { status: 400 },
      );
    }

    const targetPaise =
      typeof targetAmount === "number"
        ? Math.round(targetAmount)
        : parseInt(targetAmount, 10);
    const monthlyTargetPaise = monthlyTarget
      ? typeof monthlyTarget === "number"
        ? Math.round(monthlyTarget)
        : parseInt(monthlyTarget, 10)
      : 0;

    if (isNaN(targetPaise) || targetPaise <= 0) {
      return Response.json(
        { error: "Target amount must be a positive number greater than 0" },
        { status: 400 },
      );
    }

    // 1. Strict validation against salary / savings envelope & active goals limit
    const validation = await validateGoalTarget({
      userId: user.id,
      targetAmountPaise: targetPaise,
      monthlyTargetPaise,
    });

    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    // 2. Insert new goal
    const [goal] = await db
      .insert(schema.goals)
      .values({
        userId: user.id,
        name: name.trim(),
        icon: icon ?? "target",
        targetAmount: targetPaise,
        deadline: deadline ?? null,
        monthlyTarget: monthlyTargetPaise,
      })
      .returning();

    // 3. If a monthly allocation was set, immediately auto-allocate for current month
    if (monthlyTargetPaise > 0) {
      await processMonthlyGoalAutoAllocations(user.id);
    }

    return Response.json(goal, { status: 201 });
  } catch (error) {
    console.error("Failed to create goal:", error);
    return Response.json(
      { error: "Failed to create goal" },
      { status: 500 },
    );
  }
}
