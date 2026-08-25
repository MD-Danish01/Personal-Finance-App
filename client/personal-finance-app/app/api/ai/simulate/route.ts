import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getStructuredFinancialContext, simulatePurchaseImpact } from "@/lib/ai/context";
import { askGraniteAdvisor } from "@/lib/ai/watsonx";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { amount, itemName = "Prospective Purchase", category = "Shopping" } = body;

    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid purchase amount greater than 0" },
        { status: 400 },
      );
    }

    const context = await getStructuredFinancialContext(user.id);
    const simulation = simulatePurchaseImpact(context, numAmount, itemName, category);

    const query = `Can I afford to buy ${itemName} for ₹${numAmount.toLocaleString("en-IN")} right now?`;
    const explanation = await askGraniteAdvisor(query, context, simulation);

    return NextResponse.json({
      simulation,
      explanation,
    });
  } catch (error) {
    console.error("AI Simulate route error:", error);
    return NextResponse.json(
      { error: "Failed to simulate purchase impact" },
      { status: 500 },
    );
  }
}
