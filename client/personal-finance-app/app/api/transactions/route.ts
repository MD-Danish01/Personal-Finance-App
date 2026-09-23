import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, desc, and, gte, lte, lt, sql } from "drizzle-orm";
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

// ---------------------------------------------------------------------------
// Shared helper: run the overspend-alert check after any write that may
// have changed today's expense total.
//
// Two distinct paths:
//   1. spending > limit  → send email + insert notification (if not already
//      sent today) — "first breach" or "re-breach after a reset"
//   2. spending <= limit → delete today's notification row (if present) so
//      that a future re-breach will trigger a fresh alert.  This handles the
//      case where the user edits/deletes a transaction bringing them back
//      under budget and then later exceeds the limit again.
// ---------------------------------------------------------------------------
export async function checkAndSendOverspendAlert(
  userId: string,
  userEmail: string | null | undefined,
  userName: string | null | undefined,
  transactionDate: string,
) {
  try {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(curYear, curMonth, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = Math.max(1, lastDay - currentDay + 1);

    const todayStr = `${curYear}-${pad(curMonth)}-${pad(currentDay)}`;

    // Only run the check if the transaction is dated today
    if (transactionDate !== todayStr) return;

    const startStr = `${curYear}-${pad(curMonth)}-01`;
    const endStr = `${curYear}-${pad(curMonth)}-${pad(lastDay)}`;

    const profile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, userId),
    });
    const plan = await db.query.plans.findFirst({
      where: and(
        eq(schema.plans.userId, userId),
        eq(schema.plans.month, curMonth),
        eq(schema.plans.year, curYear),
      ),
    });
    const monthlyIncome = plan?.monthlyIncome ?? profile?.monthlyIncome ?? 0;

    if (monthlyIncome <= 0) return;

    const expenseTotals = await db
      .select({
        monthTotal: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
        todayTotal: sql<number>`coalesce(sum(case when ${schema.transactions.transactionDate} = ${todayStr} then ${schema.transactions.amount} else 0 end), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
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

    // --- deduplication window: today 00:00:00 UTC to tomorrow 00:00:00 UTC ---
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000);

    if (todayDesignatedRupees > 0 && todaySpentRupees > todayDesignatedRupees) {
      // === BREACH PATH ===
      const overspentAmount = todaySpentRupees - todayDesignatedRupees;
      const futureDays = Math.max(1, remainingDays - 1);
      const remainingMonthPaise = Math.max(0, monthlyIncome - monthSpentPaise);
      const newDailySafeToSpend = Math.max(
        0,
        Math.round(remainingMonthPaise / (remainingDays > 1 ? futureDays : 1) / 100),
      );

      // Only send if there is no active alert for today already
      const existingAlert = await db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.type, "daily_overspend_alert"),
          gte(schema.notifications.createdAt, startOfToday),
          lt(schema.notifications.createdAt, startOfTomorrow),
        ),
      });

      if (!existingAlert) {
        await db.insert(schema.notifications).values({
          userId,
          type: "daily_overspend_alert",
          title: "Daily Spending Limit Exceeded",
          body: `You have spent ₹${todaySpentRupees.toLocaleString("en-IN")} today (₹${overspentAmount.toLocaleString("en-IN")} over your ₹${todayDesignatedRupees.toLocaleString("en-IN")} daily safe-to-spend limit).`,
        });

        // Resolve email — session may not carry it
        let recipientEmail = userEmail;
        let recipientName = userName;
        if (!recipientEmail) {
          const dbUser = await db.query.authUsers.findFirst({
            where: eq(schema.authUsers.id, userId),
          });
          if (dbUser?.email) {
            recipientEmail = dbUser.email;
            recipientName = dbUser.name || recipientName;
          }
        }

        if (recipientEmail) {
          await sendOverspendingAlertEmail({
            to: recipientEmail,
            name: recipientName ?? "there",
            todaySpent: todaySpentRupees,
            dailyLimit: todayDesignatedRupees,
            overspentAmount,
            remainingDays,
            newDailySafeToSpend,
          });
        }
      }
    } else {
      // === UNDER-BUDGET PATH ===
      // User edited/deleted a transaction bringing spending back under the
      // daily limit.  Remove today's alert row so the NEXT breach (later
      // today or on a future edit) will trigger a fresh email instead of
      // being silently blocked by the stale deduplication record.
      await db
        .delete(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, userId),
            eq(schema.notifications.type, "daily_overspend_alert"),
            gte(schema.notifications.createdAt, startOfToday),
            lt(schema.notifications.createdAt, startOfTomorrow),
          ),
        );
    }
  } catch (alertErr) {
    console.error("Failed to process overspend alert:", alertErr);
  }
}

// ---------------------------------------------------------------------------
// GET — list recent transactions
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST — create a new transaction
// ---------------------------------------------------------------------------
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

    // Fire-and-forget alert check
    if (validatedType === "expense") {
      void checkAndSendOverspendAlert(user.id, user.email, user.name, validatedDate);
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

// ---------------------------------------------------------------------------
// PATCH — edit an existing transaction
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { id, amount, category, merchant, description, transactionDate, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 });
    }

    // Build update payload — only include fields that were provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (amount !== undefined) {
      const rawNumber = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
      const parsedAmount = Math.round(rawNumber * 100);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: "Invalid amount. Must be greater than 0." }, { status: 400 });
      }
      updates.amount = parsedAmount;
    }

    if (type !== undefined) {
      updates.type = type === "income" ? "income" : "expense";
    }

    if (category !== undefined) {
      updates.category = VALID_CATEGORIES.includes(category) ? category : "Others";
    }

    if (merchant !== undefined) {
      updates.merchant = merchant.trim() || "General Expense";
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (transactionDate !== undefined) {
      updates.transactionDate = transactionDate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.transactions)
      .set(updates)
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.userId, user.id),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Run the alert check whenever the updated transaction is an expense
    // (covers: amount bumped up → new breach; amount reduced → reset so
    //  a future breach can re-alert; type changed → check new state)
    const updatedType = updated.type;
    const updatedDate = updated.transactionDate;
    if (updatedType === "expense") {
      void checkAndSendOverspendAlert(user.id, user.email, user.name, updatedDate);
    } else {
      // Transaction was switched to income — treat the same as a deletion:
      // clear any stale overspend notification for today so a future expense
      // can re-trigger the alert.
      void checkAndSendOverspendAlert(user.id, user.email, user.name, updatedDate);
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: updated.id,
        amount: updated.amount,
        type: updated.type,
        category: updated.category,
        merchant: updated.merchant,
        description: updated.description ?? undefined,
        transactionDate: updated.transactionDate,
        source: updated.source,
        relativeDate: computeRelativeDate(updated.transactionDate),
      },
    });
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — remove a transaction
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 });
    }

    // Read the transaction before deleting so we know its date and type
    const existing = await db.query.transactions.findFirst({
      where: and(
        eq(schema.transactions.id, id),
        eq(schema.transactions.userId, user.id),
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await db
      .delete(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.userId, user.id),
        ),
      );

    // If an expense was deleted, recalculate today's position.
    // The helper will clear the stale notification if spending has now
    // dropped back under the daily limit — allowing a future re-breach to
    // trigger a fresh alert.
    if (existing.type === "expense") {
      void checkAndSendOverspendAlert(user.id, user.email, user.name, existing.transactionDate);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
