import crypto from "crypto";

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

/**
 * Creates a new order on Razorpay using HTTP Basic Authentication.
 * Amount must be provided in integer paise (1 INR = 100 paise).
 */
export async function createRazorpayOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes = {},
}: CreateOrderParams): Promise<RazorpayOrderResponse> {
  const keyId = RAZORPAY_KEY_ID;
  const keySecret = RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  const generatedReceipt = receipt ?? `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: Math.round(amountPaise),
      currency,
      receipt: generatedReceipt,
      notes,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Razorpay API Error]:", data);
    throw new Error(
      data?.error?.description || "Failed to create order with Razorpay",
    );
  }

  return data as RazorpayOrderResponse;
}

export async function getRazorpayOrder(
  orderId: string,
): Promise<RazorpayOrderResponse> {
  const keyId = RAZORPAY_KEY_ID;
  const keySecret = RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(
    `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`,
    {
      headers: { Authorization: `Basic ${authHeader}` },
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.description || "Failed to fetch Razorpay order");
  }

  return data as RazorpayOrderResponse;
}

export interface VerifySignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

/**
 * Cryptographically verifies that the payment response originates from Razorpay
 * using HMAC SHA256 signature matching.
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: VerifySignatureParams): boolean {
  const keySecret = RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured on the server.");
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  // Constant-time string comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8"),
    );
  } catch {
    return false;
  }
}
