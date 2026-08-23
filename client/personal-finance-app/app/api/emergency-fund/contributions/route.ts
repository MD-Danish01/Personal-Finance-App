import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  adjustEmergencyFundAmount,
  emergencyContributionCreateSchema,
  validationError,
} from "@/lib/emergency-fund";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const [fund] = await db
      .select()
      .from(schema.emergencyFunds)
      .where(eq(schema.emergencyFunds.userId, userId))
      .limit(1);
    if (!fund) return Response.json({ error: "Emergency fund not found" }, { status: 404 });

    const items = await db
      .select()
      .from(schema.emergencyFundContributions)
      .where(eq(schema.emergencyFundContributions.emergencyFundId, fund.id))
      .orderBy(asc(schema.emergencyFundContributions.contributedAt));
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
    const userId = session.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = emergencyContributionCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = await db.transaction(async (tx) => {
      const [fund] = await tx
        .select()
        .from(schema.emergencyFunds)
        .where(eq(schema.emergencyFunds.userId, userId))
        .limit(1);
      if (!fund) return null;

      const nextAmount = adjustEmergencyFundAmount(fund.currentAmount, parsed.data.amount);
      if (nextAmount === null) return "invalid" as const;

      const [contribution] = await tx
        .insert(schema.emergencyFundContributions)
        .values({
          emergencyFundId: fund.id,
          amount: parsed.data.amount,
          note: parsed.data.note,
          contributedAt: parsed.data.contributedAt
            ? new Date(parsed.data.contributedAt)
            : undefined,
        })
        .returning();
      const [updatedFund] = await tx
        .update(schema.emergencyFunds)
        .set({ currentAmount: nextAmount, updatedAt: new Date() })
        .where(
          and(
            eq(schema.emergencyFunds.id, fund.id),
            eq(schema.emergencyFunds.userId, userId),
          ),
        )
        .returning();
      return { contribution, emergencyFund: updatedFund };
    });

    if (result === null) return Response.json({ error: "Emergency fund not found" }, { status: 404 });
    if (result === "invalid") return Response.json({ error: "Invalid request" }, { status: 400 });
    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
