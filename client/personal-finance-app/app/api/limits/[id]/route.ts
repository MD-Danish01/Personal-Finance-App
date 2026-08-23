import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  isUniqueViolation,
  limitIdSchema,
  limitUpdateSchema,
  validationError,
} from "@/lib/limits";

type RouteContext = { params: Promise<{ id: string }> };

async function getLimitId(context: RouteContext) {
  const { id } = await context.params;
  return limitIdSchema.safeParse(id);
}

export async function GET(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsedId = await getLimitId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    const [limit] = await db
      .select()
      .from(schema.limits)
      .where(and(eq(schema.limits.id, parsedId.data), eq(schema.limits.userId, session.user.id)))
      .limit(1);
    if (!limit) return Response.json({ error: "Limit not found" }, { status: 404 });

    return Response.json(limit);
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
    const parsedId = await getLimitId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = limitUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    try {
      const [limit] = await db
        .update(schema.limits)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.limits.id, parsedId.data), eq(schema.limits.userId, session.user.id)))
        .returning();
      if (!limit) return Response.json({ error: "Limit not found" }, { status: 404 });
      return Response.json(limit);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Response.json(
          { error: "A limit already exists for that category" },
          { status: 409 },
        );
      }
      throw error;
    }
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
    const parsedId = await getLimitId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    const [limit] = await db
      .delete(schema.limits)
      .where(and(eq(schema.limits.id, parsedId.data), eq(schema.limits.userId, session.user.id)))
      .returning({ id: schema.limits.id });
    if (!limit) return Response.json({ error: "Limit not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
