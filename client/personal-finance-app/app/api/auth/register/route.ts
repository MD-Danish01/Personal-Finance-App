import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

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
    const cleanName = (name && typeof name === "string" ? name.trim() : "") || cleanEmail.split("@")[0];

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

    // 1. Create user
    const [newUser] = await db
      .insert(schema.authUsers)
      .values({
        id: userId,
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
      })
      .returning();

    // 2. Initialize financial profile with standard baseline
    const initialIncomePaise = 5000000; // ₹50,000 baseline
    await db
      .insert(schema.financialProfiles)
      .values({
        userId: newUser.id,
        monthlyIncome: initialIncomePaise,
        currency: "INR",
        essentialsPercent: 50,
        savingsPercent: 20,
        enjoymentPercent: 20,
        bufferPercent: 10,
        themeColor: "emerald",
        themeMode: "system",
        onboardingCompleted: true,
      })
      .onConflictDoNothing();

    // 3. Initialize emergency fund target
    await db
      .insert(schema.emergencyFunds)
      .values({
        userId: newUser.id,
        targetAmount: initialIncomePaise * 3, // 3 months baseline
        currentAmount: 0,
      })
      .onConflictDoNothing();

    // 4. Initialize current month plan
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const [plan] = await db
      .insert(schema.plans)
      .values({
        userId: newUser.id,
        month: curMonth,
        year: curYear,
        monthlyIncome: initialIncomePaise,
        status: "active",
      })
      .returning();

    if (plan) {
      await db.insert(schema.planAllocations).values([
        {
          planId: plan.id,
          key: "essentials",
          percent: 50,
          amount: Math.round(initialIncomePaise * 0.5),
        },
        {
          planId: plan.id,
          key: "future_savings",
          percent: 20,
          amount: Math.round(initialIncomePaise * 0.2),
        },
        {
          planId: plan.id,
          key: "enjoyment",
          percent: 20,
          amount: Math.round(initialIncomePaise * 0.2),
        },
        {
          planId: plan.id,
          key: "buffer",
          percent: 10,
          amount: Math.round(initialIncomePaise * 0.1),
        },
      ]);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully. You can now sign in.",
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
