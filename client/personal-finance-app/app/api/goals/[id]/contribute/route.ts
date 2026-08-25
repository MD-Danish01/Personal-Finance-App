import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const { id: goalId } = await context.params;

  try {
    const body = await req.json();
    const { amount, note } = body;

    const amountNum = typeof amount === "number" ? Math.round(amount * 100) : parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Invalid contribution amount. Must be greater than 0." },
        { status: 400 },
      );
    }

    const goal = await db.query.goals.findFirst({
      where: and(eq(schema.goals.id, goalId), eq(schema.goals.userId, user.id)),
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const newAmount = goal.currentAmount + amountNum;
    let newStatus: "on_track" | "at_risk" | "completed" = goal.status;

    if (newAmount >= goal.targetAmount) {
      newStatus = "completed";
    } else if (goal.deadline) {
      const now = new Date();
      const deadlineDate = new Date(goal.deadline);
      const createdDate = new Date(goal.createdAt);
      const totalTime = deadlineDate.getTime() - createdDate.getTime();
      const elapsedTime = now.getTime() - createdDate.getTime();

      if (totalTime > 0) {
        const expectedRatio = Math.min(Math.max(elapsedTime / totalTime, 0), 1);
        const actualRatio = newAmount / goal.targetAmount;
        newStatus = actualRatio >= expectedRatio * 0.85 ? "on_track" : "at_risk";
      }
    }

    // Insert contribution
    const [contribution] = await db
      .insert(schema.goalContributions)
      .values({
        goalId: goal.id,
        amount: amountNum,
        note: note?.trim() || null,
      })
      .returning();

    // Update goal
    const [updatedGoal] = await db
      .update(schema.goals)
      .set({
        currentAmount: newAmount,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.goals.id, goalId))
      .returning();

    return NextResponse.json({
      success: true,
      goal: updatedGoal,
      contribution,
    });
  } catch (error) {
    console.error("Failed to record goal contribution:", error);
    return NextResponse.json(
      { error: "Failed to record contribution" },
      { status: 500 },
    );
  }
}
