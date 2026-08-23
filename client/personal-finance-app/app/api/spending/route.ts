import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getMonthLabel } from "@/lib/constants";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");

  const now = new Date();
  const year = monthParam
    ? parseInt(monthParam.slice(0, 4))
    : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.slice(5, 7)) : now.getMonth() + 1;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const rows = await db
    .select({
      category: schema.transactions.category,
      total: sql<number>`sum(${schema.transactions.amount})`,
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

  return Response.json({
    monthLabel: getMonthLabel(month, year),
    total,
    byCategory: rows.map((r) => ({
      category: r.category,
      amount: Number(r.total),
    })),
  });
}
