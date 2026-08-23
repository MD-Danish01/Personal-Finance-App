import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const rows = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, user.id));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { name, icon, targetAmount, deadline, monthlyTarget } = body;

  if (!name || !targetAmount) {
    return Response.json(
      { error: "name and targetAmount are required" },
      { status: 400 },
    );
  }

  const [goal] = await db
    .insert(schema.goals)
    .values({
      userId: user.id,
      name,
      icon: icon ?? "target",
      targetAmount,
      deadline: deadline ?? null,
      monthlyTarget: monthlyTarget ?? 0,
    })
    .returning();

  return Response.json(goal, { status: 201 });
}
