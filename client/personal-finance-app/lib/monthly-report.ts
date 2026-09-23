import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendMonthlyReportEmail } from "@/lib/email";

export async function sendMonthlyReportIfDue(
  userId: string,
  now = new Date(),
): Promise<void> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  if (now.getDate() !== lastDay) return;

  const monthKey = `${year}_${String(month).padStart(2, "0")}`;
  const reportType = `monthly_report_${monthKey}`;
  const alreadySent = await db.query.notifications.findFirst({
    where: and(
      eq(schema.notifications.userId, userId),
      eq(schema.notifications.type, reportType),
    ),
  });
  if (alreadySent) return;

  const user = await db.query.authUsers.findFirst({
    where: eq(schema.authUsers.id, userId),
  });
  if (!user?.email) return;

  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, userId),
  });
  const plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.userId, userId),
      eq(schema.plans.month, month),
      eq(schema.plans.year, year),
    ),
  });

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const rows = await db
    .select({
      category: schema.transactions.category,
      total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.transactionDate, start),
        lt(schema.transactions.transactionDate, end),
      ),
    )
    .groupBy(schema.transactions.category);

  const spentPaise = rows.reduce((total, row) => total + Number(row.total), 0);
  const budgetPaise = plan?.monthlyIncome ?? profile?.monthlyIncome ?? 0;
  const monthLabel = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const result = await sendMonthlyReportEmail({
    to: user.email,
    name: user.name ?? "there",
    monthLabel,
    budget: Math.round(budgetPaise / 100),
    spent: Math.round(spentPaise / 100),
    remaining: Math.max(0, Math.round((budgetPaise - spentPaise) / 100)),
    categoryBreakdown: rows.map((row) => ({
      category: row.category,
      amount: Math.round(Number(row.total) / 100),
    })),
  });

  if (!result.success) return;
  await db.insert(schema.notifications).values({
    userId,
    type: reportType,
    title: `${monthLabel} monthly report sent`,
    body: `Your monthly spending report was sent to ${user.email}.`,
  });
}
