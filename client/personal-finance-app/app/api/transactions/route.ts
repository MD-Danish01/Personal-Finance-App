import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { computeRelativeDate } from "@/lib/constants";
import { sendOverspendingAlertEmail } from "@/lib/email";

const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
] as const;

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  const rows = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, user.id))
    .orderBy(desc(schema.transactions.transactionDate), desc(schema.transactions.createdAt))
    .limit(limit);

  const items = rows.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    merchant: tx.merchant,
    description: tx.description ?? undefined,
    transactionDate: tx.transactionDate,
    source: tx.source,
    relativeDate: computeRelativeDate(tx.transactionDate),
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { amount, type = "expense", category = "Others", merchant, description, transactionDate } = body;

    // Amount comes in standard rupees from frontend (e.g., 200 or "200" or 200.50)
    // Convert to integer paise (1 INR = 100 paise)
    const rawNumber = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
    const parsedAmount = Math.round(rawNumber * 100);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount. Must be greater than 0." }, { status: 400 });
    }

    const validatedType = type === "income" ? "income" : "expense";
    const validatedCategory = VALID_CATEGORIES.includes(category) ? category : "Others";
    const validatedMerchant = (merchant || (validatedType === "income" ? "Salary / Credit" : "General Expense")).trim();
    const validatedDate = transactionDate || new Date().toISOString().slice(0, 10);

    const [inserted] = await db
      .insert(schema.transactions)
      .values({
        userId: user.id,
        amount: parsedAmount,
        type: validatedType,
        category: validatedCategory,
        merchant: validatedMerchant,
        description: description?.trim() || null,
        transactionDate: validatedDate,
        source: "MANUAL",
      })
      .returning();

    // If an expense is added, check if it triggers a daily overspending alert
    if (validatedType === "expense") {
      (async () => {
        try {
          const now = new Date();
          const curYear = now.getFullYear();
          const curMonth = now.getMonth() + 1;
          const pad = (n: number) => String(n).padStart(2, "0");
          const lastDay = new Date(curYear, curMonth, 0).getDate();
          const currentDay = now.getDate();
          const remainingDays = Math.max(1, lastDay - currentDay + 1);

          const startStr = `${curYear}-${pad(curMonth)}-01`;
          const endStr = `${curYear}-${pad(curMonth)}-${pad(lastDay)}`;
          const todayStr = `${curYear}-${pad(curMonth)}-${pad(currentDay)}`;

          if (validatedDate === todayStr) {
            const profile = await db.query.financialProfiles.findFirst({
              where: eq(schema.financialProfiles.userId, user.id),
            });
            const plan = await db.query.plans.findFirst({
              where: and(
                eq(schema.plans.userId, user.id),
                eq(schema.plans.month, curMonth),
                eq(schema.plans.year, curYear),
              ),
            });
            const monthlyIncome = plan?.monthlyIncome ?? profile?.monthlyIncome ?? 0;

            if (monthlyIncome > 0) {
              const expenseTotals = await db
                .select({
                  monthTotal: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
                  todayTotal: sql<number>`coalesce(sum(case when ${schema.transactions.transactionDate} = ${todayStr} then ${schema.transactions.amount} else 0 end), 0)`,
                })
                .from(schema.transactions)
                .where(
                  and(
                    eq(schema.transactions.userId, user.id),
                    eq(schema.transactions.type, "expense"),
                    gte(schema.transactions.transactionDate, startStr),
                    lte(schema.transactions.transactionDate, endStr),
                  ),
                );

              const monthSpentPaise = Number(expenseTotals[0]?.monthTotal ?? 0);
              const todaySpentPaise = Number(expenseTotals[0]?.todayTotal ?? 0);
              const todaySpentRupees = Math.round(todaySpentPaise / 100);

              const spentPriorToTodayPaise = Math.max(0, monthSpentPaise - todaySpentPaise);
              const availableAtStartOfTodayPaise = Math.max(0, monthlyIncome - spentPriorToTodayPaise);
              const todayDesignatedRupees = Math.max(
                0,
                Math.round(availableAtStartOfTodayPaise / remainingDays / 100),
              );

              if (todayDesignatedRupees > 0 && todaySpentRupees > todayDesignatedRupees) {
                const overspentAmount = todaySpentRupees - todayDesignatedRupees;
                const futureDays = Math.max(1, remainingDays - 1);
                const remainingMonthPaise = Math.max(0, monthlyIncome - monthSpentPaise);
                const newDailySafeToSpend = Math.max(
                  0,
                  Math.round(remainingMonthPaise / (remainingDays > 1 ? futureDays : 1) / 100),
                );

                // Check deduplication in notifications table for today
                const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
                const existingAlert = await db.query.notifications.findFirst({
                  where: and(
                    eq(schema.notifications.userId, user.id),
                    eq(schema.notifications.type, "daily_overspend_alert"),
                    gte(schema.notifications.createdAt, startOfToday),
                  ),
                });

                if (!existingAlert) {
                  await db.insert(schema.notifications).values({
                    userId: user.id,
                    type: "daily_overspend_alert",
                    title: "Daily Spending Limit Exceeded",
                    body: `You have spent ₹${todaySpentRupees.toLocaleString("en-IN")} today (₹${overspentAmount.toLocaleString("en-IN")} over your ₹${todayDesignatedRupees.toLocaleString("en-IN")} daily safe-to-spend limit).`,
                  });

                  let recipientEmail = user.email;
                  let recipientName = user.name;
                  if (!recipientEmail) {
                    const dbUser = await db.query.authUsers.findFirst({
                      where: eq(schema.authUsers.id, user.id),
                    });
                    if (dbUser?.email) {
                      recipientEmail = dbUser.email;
                      recipientName = dbUser.name || recipientName;
                    }
                  }

                  if (recipientEmail) {
                    await sendOverspendingAlertEmail({
                      to: recipientEmail,
                      name: recipientName,
                      todaySpent: todaySpentRupees,
                      dailyLimit: todayDesignatedRupees,
                      overspentAmount,
                      remainingDays,
                      newDailySafeToSpend,
                    });
                  }
                }
              }
            }
          }
        } catch (alertErr) {
          console.error("Failed to process overspend alert email:", alertErr);
        }
      })();
    }

    return NextResponse.json(
      {
        success: true,
        transaction: {
          id: inserted.id,
          amount: inserted.amount,
          type: inserted.type,
          category: inserted.category,
          merchant: inserted.merchant,
          description: inserted.description ?? undefined,
          transactionDate: inserted.transactionDate,
          source: inserted.source,
          relativeDate: computeRelativeDate(inserted.transactionDate),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
  }
}
