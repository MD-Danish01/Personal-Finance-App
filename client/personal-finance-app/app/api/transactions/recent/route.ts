import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, desc } from "drizzle-orm";
import { computeRelativeDate } from "@/lib/constants";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const rows = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, user.id))
    .orderBy(desc(schema.transactions.transactionDate))
    .limit(10);

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

  return Response.json({ items });
}
