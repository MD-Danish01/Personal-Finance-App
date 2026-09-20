import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const { id: goalId } = await context.params;

  try {
    const body = await req.json();
    const { name, icon, targetAmount, deadline, monthlyTarget } = body;

    if (!name || targetAmount === undefined) {
      return NextResponse.json(
        { error: "name and targetAmount are required" },
        { status: 400 },
      );
    }

    const targetPaise =
      typeof targetAmount === "number"
        ? Math.round(targetAmount)
        : parseInt(targetAmount, 10);

    if (isNaN(targetPaise) || targetPaise <= 0) {
      return NextResponse.json(
        { error: "Target amount must be greater than 0" },
        { status: 400 },
      );
    }

    const existingGoal = await db.query.goals.findFirst({
      where: and(eq(schema.goals.id, goalId), eq(schema.goals.userId, user.id)),
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const isCompleted = existingGoal.currentAmount >= targetPaise;
    const newStatus = isCompleted ? "completed" : "on_track";

    const [updated] = await db
      .update(schema.goals)
      .set({
        name: name.trim(),
        icon: icon ?? existingGoal.icon,
        targetAmount: targetPaise,
        deadline: deadline || null,
        monthlyTarget: monthlyTarget ? Math.round(Number(monthlyTarget)) : 0,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.goals.id, goalId), eq(schema.goals.userId, user.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const { id: goalId } = await context.params;

  try {
    const existingGoal = await db.query.goals.findFirst({
      where: and(eq(schema.goals.id, goalId), eq(schema.goals.userId, user.id)),
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await db
      .delete(schema.goals)
      .where(and(eq(schema.goals.id, goalId), eq(schema.goals.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 },
    );
  }
}
