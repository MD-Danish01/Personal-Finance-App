import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getMonthLabel } from "@/lib/constants";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month");

    const now = new Date();
    const year = monthParam
      ? parseInt(monthParam.slice(0, 4), 10)
      : now.getFullYear();
    const month = monthParam
      ? parseInt(monthParam.slice(5, 7), 10)
      : now.getMonth() + 1;

    const pad = (n: number) => String(n).padStart(2, "0");
    const startStr = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${pad(month)}-${pad(lastDay)}`;

    const rows = await db
      .select({
        category: schema.transactions.category,
        total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.transactionDate, startStr),
          lte(schema.transactions.transactionDate, endStr),
        ),
      )
      .groupBy(schema.transactions.category);

    const total = rows.reduce((sum, r) => sum + Number(r.total), 0);

    return NextResponse.json({
      monthLabel: getMonthLabel(month, year),
      total,
      byCategory: rows.map((r) => ({
        category: r.category,
        amount: Number(r.total),
      })),
    });
  } catch (error) {
    console.error("Failed to get spending breakdown:", error);
    const now = new Date();
    return NextResponse.json({
      monthLabel: getMonthLabel(now.getMonth() + 1, now.getFullYear()),
      total: 0,
      byCategory: [],
    });
  }
}
