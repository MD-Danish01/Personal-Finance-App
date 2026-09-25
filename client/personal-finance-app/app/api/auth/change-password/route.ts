import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { sendPasswordChangeOtpEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

// POST /api/auth/change-password
// Sends a 6-digit OTP to the user's registered email to authorise a password change.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();

    const user = await db.query.authUsers.findFirst({
      where: eq(schema.authUsers.email, email),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Only credential (email+password) accounts can change their password
    if (!user.password) {
      return NextResponse.json(
        { error: "Password change is not available for social login accounts (Google, GitHub, etc.)." },
        { status: 400 },
      );
    }

    // Generate a 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Reuse the verification tokens table — identifier prefixed to avoid collision
    const identifier = `pwd-change:${email}`;

    await db
      .delete(schema.authVerificationTokens)
      .where(eq(schema.authVerificationTokens.identifier, identifier));

    await db.insert(schema.authVerificationTokens).values({
      identifier,
      token: otp,
      expires: expiresAt,
    });

    const emailResult = await sendPasswordChangeOtpEmail({
      to: email,
      name: user.name || "there",
      otp,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit code has been sent to ${email}. It expires in 10 minutes.`,
    });
  } catch (error) {
    console.error("Change password (send OTP) error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
