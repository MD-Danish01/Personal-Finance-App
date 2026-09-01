import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/email";
import { ensureUserProfileAndPlan } from "@/lib/user-init";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName =
      (name && typeof name === "string" ? name.trim() : "") ||
      cleanEmail.split("@")[0];

    // Check if user already exists
    const existingUser = await db.query.authUsers.findFirst({
      where: eq(schema.authUsers.email, cleanEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    }

    const hashedPassword = hashPassword(password);
    const userId = crypto.randomUUID();

    // 1. Create user in database (emailVerified defaults to null until link is clicked)
    const [newUser] = await db
      .insert(schema.authUsers)
      .values({
        id: userId,
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
      })
      .returning();

    // 2. Initialize user financial profile, emergency fund, and current month plan
    await ensureUserProfileAndPlan(newUser.id);

    // 3. Generate email verification token (24-hour expiration)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Delete any previous tokens for this email
    await db
      .delete(schema.authVerificationTokens)
      .where(eq(schema.authVerificationTokens.identifier, cleanEmail));

    await db.insert(schema.authVerificationTokens).values({
      identifier: cleanEmail,
      token: verificationToken,
      expires: expiresAt,
    });

    // 4. Send verification email via Resend
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      req.nextUrl.origin;

    await sendVerificationEmail({
      to: cleanEmail,
      name: cleanName,
      token: verificationToken,
      baseUrl,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully! Verification email sent.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
