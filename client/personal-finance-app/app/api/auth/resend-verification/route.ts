import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await db.query.authUsers.findFirst({
      where: eq(schema.authUsers.email, cleanEmail),
    });

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists, a verification email has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Your email is already verified. You can sign in.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .delete(schema.authVerificationTokens)
      .where(eq(schema.authVerificationTokens.identifier, cleanEmail));

    await db.insert(schema.authVerificationTokens).values({
      identifier: cleanEmail,
      token: verificationToken,
      expires: expiresAt,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      req.nextUrl.origin;

    await sendVerificationEmail({
      to: cleanEmail,
      name: user.name || "there",
      token: verificationToken,
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email." },
      { status: 500 },
    );
  }
}
