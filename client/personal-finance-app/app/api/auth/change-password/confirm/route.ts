import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

// POST /api/auth/change-password/confirm
// Verifies the OTP and updates the user's password.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();
    const { otp, newPassword } = body;

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json({ error: "Please enter the 6-digit code." }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    const email = session.user.email.toLowerCase().trim();
    const identifier = `pwd-change:${email}`;

    const tokenRow = await db.query.authVerificationTokens.findFirst({
      where: eq(schema.authVerificationTokens.identifier, identifier),
    });

    if (!tokenRow) {
      return NextResponse.json(
        { error: "No pending password change request. Please request a new code." },
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
        { error: "Incorrect code. Please check the email and try again." },
        { status: 400 },
      );
    }

    // OTP is valid — update the password
    const hashedPassword = hashPassword(newPassword);

    await db
      .update(schema.authUsers)
      .set({ password: hashedPassword })
      .where(eq(schema.authUsers.email, email));

    // Delete used OTP
    await db
      .delete(schema.authVerificationTokens)
      .where(eq(schema.authVerificationTokens.identifier, identifier));

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("Change password (confirm) error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
