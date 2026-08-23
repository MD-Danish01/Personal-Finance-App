import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  transactionCreateSchema,
  transactionQuerySchema,
  validationError,
} from "@/lib/transactions";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = transactionQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!query.success) return validationError(query.error);

    const conditions = [eq(schema.transactions.userId, session.user.id)];
    if (query.data.category) {
      conditions.push(eq(schema.transactions.category, query.data.category));
    }
    if (query.data.type) {
      conditions.push(eq(schema.transactions.type, query.data.type));
    }
    if (query.data.dateFrom) {
      conditions.push(gte(schema.transactions.transactionDate, query.data.dateFrom));
    }
    if (query.data.dateTo) {
      conditions.push(lte(schema.transactions.transactionDate, query.data.dateTo));
    }

    const items = await db
      .select()
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.transactionDate), desc(schema.transactions.createdAt))
      .limit(query.data.limit)
      .offset(query.data.offset);

    return Response.json({ items, limit: query.data.limit, offset: query.data.offset });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        ...parsed.data,
        userId: session.user.id,
        source: "MANUAL",
        financialBucket: parsed.data.financialBucket,
      })
      .returning();

    return Response.json(transaction, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
