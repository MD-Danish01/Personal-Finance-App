import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  adjustEmergencyFundAmount,
  emergencyContributionIdSchema,
  emergencyContributionUpdateSchema,
  validationError,
} from "@/lib/emergency-fund";

type RouteContext = { params: Promise<{ id: string }> };

async function getContributionId(context: RouteContext) {
  const { id } = await context.params;
  return emergencyContributionIdSchema.safeParse(id);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const parsedId = await getContributionId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = emergencyContributionUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ fund: schema.emergencyFunds, contribution: schema.emergencyFundContributions })
        .from(schema.emergencyFundContributions)
        .innerJoin(
          schema.emergencyFunds,
          eq(schema.emergencyFunds.id, schema.emergencyFundContributions.emergencyFundId),
        )
        .where(
          and(
            eq(schema.emergencyFundContributions.id, parsedId.data),
            eq(schema.emergencyFunds.userId, userId),
          ),
        )
        .limit(1);
      if (!owned) return null;

      const nextAmount = parsed.data.amount === undefined
        ? owned.fund.currentAmount
        : adjustEmergencyFundAmount(
            owned.fund.currentAmount,
            parsed.data.amount - owned.contribution.amount,
          );
      if (nextAmount === null) return "invalid" as const;

      const [contribution] = await tx
        .update(schema.emergencyFundContributions)
        .set({
          ...(parsed.data.amount === undefined ? {} : { amount: parsed.data.amount }),
          ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
          ...(parsed.data.contributedAt === undefined
            ? {}
            : { contributedAt: new Date(parsed.data.contributedAt) }),
        })
        .where(eq(schema.emergencyFundContributions.id, owned.contribution.id))
        .returning();
      const [emergencyFund] = await tx
        .update(schema.emergencyFunds)
        .set({ currentAmount: nextAmount, updatedAt: new Date() })
        .where(
          and(
            eq(schema.emergencyFunds.id, owned.fund.id),
            eq(schema.emergencyFunds.userId, userId),
          ),
        )
        .returning();
      return { contribution, emergencyFund };
    });

    if (result === null) return Response.json({ error: "Contribution not found" }, { status: 404 });
    if (result === "invalid") return Response.json({ error: "Invalid request" }, { status: 400 });
    return Response.json(result);
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
    const userId = session.user.id;
    const parsedId = await getContributionId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ fund: schema.emergencyFunds, contribution: schema.emergencyFundContributions })
        .from(schema.emergencyFundContributions)
        .innerJoin(
          schema.emergencyFunds,
          eq(schema.emergencyFunds.id, schema.emergencyFundContributions.emergencyFundId),
        )
        .where(
          and(
            eq(schema.emergencyFundContributions.id, parsedId.data),
            eq(schema.emergencyFunds.userId, userId),
          ),
        )
        .limit(1);
      if (!owned) return null;
      const nextAmount = adjustEmergencyFundAmount(
        owned.fund.currentAmount,
        -owned.contribution.amount,
      );
      if (nextAmount === null) return "invalid" as const;

      await tx
        .delete(schema.emergencyFundContributions)
        .where(eq(schema.emergencyFundContributions.id, owned.contribution.id));
      await tx
        .update(schema.emergencyFunds)
        .set({ currentAmount: nextAmount, updatedAt: new Date() })
        .where(
          and(
            eq(schema.emergencyFunds.id, owned.fund.id),
            eq(schema.emergencyFunds.userId, userId),
          ),
        );
      return { remainingAmount: nextAmount };
    });

    if (result === null) return Response.json({ error: "Contribution not found" }, { status: 404 });
    if (result === "invalid") return Response.json({ error: "Invalid request" }, { status: 400 });
    return Response.json({ success: true, ...result });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
