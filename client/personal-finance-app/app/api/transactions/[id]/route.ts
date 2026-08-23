import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  transactionIdSchema,
  transactionUpdateSchema,
  validationError,
} from "@/lib/transactions";

type RouteContext = { params: Promise<{ id: string }> };

async function getTransactionId(context: RouteContext) {
  const { id } = await context.params;
  return transactionIdSchema.safeParse(id);
}

export async function GET(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = await getTransactionId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const [transaction] = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, parsedId.data),
          eq(schema.transactions.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    return Response.json(transaction);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = await getTransactionId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsedBody = transactionUpdateSchema.safeParse(body);
    if (!parsedBody.success) return validationError(parsedBody.error);

    const [transaction] = await db
      .update(schema.transactions)
      .set(parsedBody.data)
      .where(
        and(
          eq(schema.transactions.id, parsedId.data),
          eq(schema.transactions.userId, session.user.id),
        ),
      )
      .returning();

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    return Response.json(transaction);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = await getTransactionId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const [transaction] = await db
      .delete(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, parsedId.data),
          eq(schema.transactions.userId, session.user.id),
        ),
      )
      .returning({ id: schema.transactions.id });

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
