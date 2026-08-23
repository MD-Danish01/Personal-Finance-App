import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  isUniqueViolation,
  limitCreateSchema,
  validationError,
} from "@/lib/limits";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await db
      .select()
      .from(schema.limits)
      .where(eq(schema.limits.userId, session.user.id))
      .orderBy(asc(schema.limits.category));

    return Response.json({ items });
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

    const parsed = limitCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    try {
      const [limit] = await db
        .insert(schema.limits)
        .values({ ...parsed.data, userId: session.user.id })
        .returning();
      return Response.json(limit, { status: 201 });
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
