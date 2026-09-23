import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { createRazorpayOrder, RAZORPAY_KEY_ID } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { amount, recipientName = "", upiId = "", category = "Others", note = "" } = body;

    const rawNumber = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
    const parsedAmountPaise = Math.round(rawNumber * 100);

    if (isNaN(parsedAmountPaise) || parsedAmountPaise <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be greater than ₹0." },
        { status: 400 },
      );
    }

    if (parsedAmountPaise > 10000000) { // Max ₹1,00,000 (1 crore paise)
      return NextResponse.json(
        { error: "Maximum transfer limit is ₹1,00,000." },
        { status: 400 },
      );
    }

    const order = await createRazorpayOrder({
      amountPaise: parsedAmountPaise,
      currency: "INR",
      notes: {
        userId: user.id,
        userEmail: user.email || "",
        recipientName: String(recipientName).slice(0, 100),
        upiId: String(upiId).slice(0, 100),
        category: String(category).slice(0, 50),
        note: String(note).slice(0, 200),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    console.error("Razorpay order creation error:", err);
    const message = err instanceof Error ? err.message : "Failed to create payment order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
