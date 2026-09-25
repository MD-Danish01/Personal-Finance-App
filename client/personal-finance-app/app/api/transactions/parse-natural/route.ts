import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { parseNaturalLanguageTransaction } from "@/lib/ai/transaction-parser";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Text prompt is required" },
        { status: 400 }
      );
    }

    const result = await parseNaturalLanguageTransaction(text.trim());

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error parsing natural language transaction:", error);
    return NextResponse.json(
      { error: "Failed to parse transaction description" },
      { status: 500 }
    );
  }
}
