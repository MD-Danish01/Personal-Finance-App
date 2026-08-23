import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  calculateEmergencyFundProgress,
  emergencyFundCreateSchema,
  emergencyFundUpdateSchema,
  isUniqueViolation,
  isEmergencyFundSnapshotConsistent,
  validationError,
} from "@/lib/emergency-fund";
import { sumAmounts } from "@/lib/finance/calculations";

function withProgress(
  emergencyFund: typeof schema.emergencyFunds["$inferSelect"],
) {
  return {
    ...emergencyFund,
    ...calculateEmergencyFundProgress(
      emergencyFund.targetAmount,
      emergencyFund.currentAmount,
    ),
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [emergencyFund] = await db
      .select()
      .from(schema.emergencyFunds)
      .where(eq(schema.emergencyFunds.userId, session.user.id))
      .limit(1);
    if (!emergencyFund) {
      return Response.json({ error: "Emergency fund not found" }, { status: 404 });
    }

    return Response.json(withProgress(emergencyFund));
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
    const parsed = emergencyFundCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    try {
      const [emergencyFund] = await db
        .insert(schema.emergencyFunds)
        .values({ ...parsed.data, userId: session.user.id })
        .returning();
      return Response.json(withProgress(emergencyFund), { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Response.json(
          { error: "An emergency fund already exists" },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    const parsed = emergencyFundUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const emergencyFund = await db.transaction(async (tx) => {
      const [currentFund] = await tx
        .select()
        .from(schema.emergencyFunds)
        .where(eq(schema.emergencyFunds.userId, userId))
        .limit(1);
      if (!currentFund) return null;

      if (parsed.data.currentAmount !== undefined) {
        const contributions = await tx
          .select({ amount: schema.emergencyFundContributions.amount })
          .from(schema.emergencyFundContributions)
          .where(eq(schema.emergencyFundContributions.emergencyFundId, currentFund.id));
        const contributionsTotal = sumAmounts(contributions.map((item) => item.amount));
        if (!isEmergencyFundSnapshotConsistent(parsed.data.currentAmount, contributionsTotal)) {
          return "invalid" as const;
        }
      }

      const [updatedFund] = await tx
        .update(schema.emergencyFunds)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(schema.emergencyFunds.id, currentFund.id))
        .returning();
      return updatedFund;
    });
    if (emergencyFund === "invalid") {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!emergencyFund) {
      return Response.json({ error: "Emergency fund not found" }, { status: 404 });
    }

    return Response.json(withProgress(emergencyFund));
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [emergencyFund] = await db
      .delete(schema.emergencyFunds)
      .where(eq(schema.emergencyFunds.userId, session.user.id))
      .returning({ id: schema.emergencyFunds.id });
    if (!emergencyFund) {
      return Response.json({ error: "Emergency fund not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
