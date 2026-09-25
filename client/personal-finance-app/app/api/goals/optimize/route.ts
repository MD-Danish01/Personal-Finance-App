import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { calculateAiGoalRecommendations } from "@/lib/goals-engine";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const plan = await calculateAiGoalRecommendations(user.id);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to calculate goal rebalance plan:", error);
    return NextResponse.json(
      { error: "Failed to calculate goal recommendations" },
      { status: 500 },
    );
  }
}
