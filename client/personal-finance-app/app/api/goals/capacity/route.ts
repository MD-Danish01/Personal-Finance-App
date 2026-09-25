import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getGoalLimitsAndCapacity } from "@/lib/goals-engine";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const capacity = await getGoalLimitsAndCapacity(user.id);
    return NextResponse.json(capacity);
  } catch (error) {
    console.error("Failed to fetch goal capacity:", error);
    return NextResponse.json(
      { error: "Failed to fetch goal capacity" },
      { status: 500 },
    );
  }
}
