import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { checkAndSendOverspendAlert } from "@/app/api/transactions/route";

const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
] as const;

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transferDetails,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required Razorpay payment credentials." },
        { status: 400 },
      );
    }

    // 1. Cryptographically verify signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.warn(
        `[Razorpay Tamper Warning]: Invalid signature for order ${razorpay_order_id} & payment ${razorpay_payment_id}`,
      );
      return NextResponse.json(
        { error: "Payment verification failed. Invalid signature." },
        { status: 400 },
      );
    }

    // 2. Validate transfer details
    const rawAmount = transferDetails?.amount;
    const parsedAmountRupees =
      typeof rawAmount === "number"
        ? rawAmount
        : parseFloat(String(rawAmount || "0").replace(/,/g, ""));
    const parsedAmountPaise = Math.round(parsedAmountRupees * 100);

    if (isNaN(parsedAmountPaise) || parsedAmountPaise <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 },
      );
    }

    const category = VALID_CATEGORIES.includes(transferDetails?.category)
      ? transferDetails.category
      : "Others";

    const recipientName = String(transferDetails?.recipientName || "").trim();
    const upiId = String(transferDetails?.upiId || "").trim();
    const note = String(transferDetails?.note || "").trim();

    const merchantLabel = recipientName
      ? `Transfer → ${recipientName}`
      : upiId
      ? `Transfer → ${upiId}`
      : "Transfer via Razorpay";

    const descriptionParts = [
      note,
      upiId ? `UPI: ${upiId}` : null,
      `Razorpay: ${razorpay_payment_id}`,
      `Order: ${razorpay_order_id}`,
    ].filter(Boolean);

    const todayDate = new Date().toISOString().slice(0, 10);

    // 3. Insert transaction into the persistent financial ledger
    const [inserted] = await db
      .insert(schema.transactions)
      .values({
        userId: user.id,
        amount: parsedAmountPaise,
        type: "expense",
        category,
        merchant: merchantLabel,
        description: descriptionParts.join(" | "),
        transactionDate: todayDate,
        source: "MANUAL",
      })
      .returning();

    // 4. Fire-and-forget overspend budget evaluation
    void checkAndSendOverspendAlert(user.id, user.email, user.name, todayDate);

    console.log(
      `[Razorpay Verified]: Payment ${razorpay_payment_id} recorded as transaction ${inserted.id} for user ${user.id}`,
    );

    return NextResponse.json({
      success: true,
      transactionId: inserted.id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (err: unknown) {
    console.error("Razorpay payment verification error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to verify and process payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
