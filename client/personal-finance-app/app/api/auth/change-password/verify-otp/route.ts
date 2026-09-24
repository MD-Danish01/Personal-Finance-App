import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/auth/change-password/verify-otp
// Validates the OTP only — does NOT change the password.
// Returns success so the UI can advance to the new-password step.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();
    const { otp } = body;

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json({ error: "Please enter the 6-digit code." }, { status: 400 });
    }

    const email = session.user.email.toLowerCase().trim();
    const identifier = `pwd-change:${email}`;

    const tokenRow = await db.query.authVerificationTokens.findFirst({
      where: eq(schema.authVerificationTokens.identifier, identifier),
    });

    if (!tokenRow) {
      return NextResponse.json(
        { error: "No pending request found. Please request a new code." },
        { status: 400 },
      );
    }

    if (new Date() > tokenRow.expires) {
      await db
        .delete(schema.authVerificationTokens)
        .where(eq(schema.authVerificationTokens.identifier, identifier));
      return NextResponse.json(
        { error: "This code has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (tokenRow.token !== otp.trim()) {
      return NextResponse.json(
        { error: "Incorrect code. Please check your email and try again." },
        { status: 400 },
      );
    }

    // OTP is correct — do NOT delete it yet (confirm route will use + delete it)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
