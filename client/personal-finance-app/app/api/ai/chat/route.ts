import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getStructuredFinancialContext } from "@/lib/ai/context";
import { askGraniteAdvisor } from "@/lib/ai/watsonx";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    const context = await getStructuredFinancialContext(user.id);
    const reply = await askGraniteAdvisor(message.trim(), context);
    const suggestedChips = [
      "Can I afford a ₹5,000 purchase?",
      "How to increase my daily Safe-to-Spend?",
      "Where can I cut expenses this week?",
    ];

    return NextResponse.json({
      reply,
      suggestedChips,
      metricsSnapshot: {
        dailySafeToSpend: context.dailySafeToSpendRupees,
        spentThisMonth: context.spentRupees,
        remainingDays: context.remainingDays,
      },
    });
  } catch (error) {
    console.error("AI Chat route error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response. Please try again." },
      { status: 500 },
    );
  }
}
