import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await db
      .select()
      .from(schema.connectedFinancialAccounts)
      .where(eq(schema.connectedFinancialAccounts.userId, session.user.id))
      .orderBy(desc(schema.connectedFinancialAccounts.linkedAt));
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
