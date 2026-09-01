import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    req.nextUrl.origin;

  if (!token || !email) {
    return NextResponse.redirect(`${baseUrl}/login?error=InvalidVerificationLink`);
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. Look up token in verification tokens table
    const verificationRecord = await db.query.authVerificationTokens.findFirst({
      where: and(
        eq(schema.authVerificationTokens.identifier, cleanEmail),
        eq(schema.authVerificationTokens.token, token),
      ),
    });

    if (!verificationRecord) {
      return NextResponse.redirect(`${baseUrl}/login?error=InvalidOrExpiredToken`);
    }

    // 2. Check expiration
    if (new Date() > new Date(verificationRecord.expires)) {
      await db
        .delete(schema.authVerificationTokens)
        .where(
          and(
            eq(schema.authVerificationTokens.identifier, cleanEmail),
            eq(schema.authVerificationTokens.token, token),
          ),
        );
      return NextResponse.redirect(`${baseUrl}/login?error=TokenExpired`);
    }

    // 3. Mark user's email as verified
    await db
      .update(schema.authUsers)
      .set({
        emailVerified: new Date(),
      })
      .where(eq(schema.authUsers.email, cleanEmail));

    // 4. Delete used token
    await db
      .delete(schema.authVerificationTokens)
      .where(
        and(
          eq(schema.authVerificationTokens.identifier, cleanEmail),
          eq(schema.authVerificationTokens.token, token),
        ),
      );

    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=VerificationFailed`);
  }
}
