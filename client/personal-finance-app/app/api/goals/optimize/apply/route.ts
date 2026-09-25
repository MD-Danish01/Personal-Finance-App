import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  applyRebalancePlan,
  processMonthlyGoalAutoAllocations,
} from "@/lib/goals-engine";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { allocations } = body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: "Invalid allocations array" },
        { status: 400 },
      );
    }

    const { updatedCount } = await applyRebalancePlan(user.id, allocations);

    // Refresh monthly allocations for the current month with new targets
    await processMonthlyGoalAutoAllocations(user.id);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully rebalanced ${updatedCount} goal(s) to AI recommended amounts.`,
    });
  } catch (error) {
    console.error("Failed to apply goal rebalance:", error);
    return NextResponse.json(
      { error: "Failed to apply goal rebalance" },
      { status: 500 },
    );
  }
}
