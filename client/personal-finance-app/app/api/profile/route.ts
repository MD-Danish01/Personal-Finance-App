import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  isUniqueViolation,
  profileCreateSchema,
  profileUpdateSchema,
  validationError,
} from "@/lib/profile";

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile] = await db
      .select()
      .from(schema.financialProfiles)
      .where(eq(schema.financialProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    return Response.json(profile);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = profileCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const [existingProfile] = await db
      .select({ id: schema.financialProfiles.id })
      .from(schema.financialProfiles)
      .where(eq(schema.financialProfiles.userId, userId))
      .limit(1);

    if (existingProfile) {
      return Response.json({ error: "Profile already exists" }, { status: 409 });
    }

    try {
      const [profile] = await db
        .insert(schema.financialProfiles)
        .values({ ...parsed.data, userId })
        .returning();

      return Response.json(profile, { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Response.json({ error: "Profile already exists" }, { status: 409 });
      }
      throw error;
    }
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const [profile] = await db
      .update(schema.financialProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.financialProfiles.userId, userId))
      .returning();

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    return Response.json(profile);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
