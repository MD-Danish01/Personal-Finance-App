import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const latestConsent = await db.query.setuConsents.findFirst({
    where: eq(schema.setuConsents.userId, user.id),
    orderBy: [desc(schema.setuConsents.createdAt)],
  });

  const accounts = await db.query.connectedFinancialAccounts.findMany({
    where: eq(schema.connectedFinancialAccounts.userId, user.id),
    orderBy: [desc(schema.connectedFinancialAccounts.linkedAt)],
  });

  return NextResponse.json({
    consent: latestConsent
      ? {
          consentId: latestConsent.consentId,
          status: latestConsent.status,
          consentExpiry: latestConsent.consentExpiry,
          createdAt: latestConsent.createdAt,
        }
      : null,
    accounts: accounts.map((acc) => ({
      id: acc.id,
      fipId: acc.fipId,
      fipName: acc.fipName,
      maskedAccountNumber: acc.maskedAccountNumber,
      accountType: acc.accountType,
      linkedAt: acc.linkedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { action, consentId } = body;

    if (action === "revoke" && consentId) {
      await db
        .update(schema.setuConsents)
        .set({ status: "REVOKED" })
        .where(eq(schema.setuConsents.consentId, consentId));

      await db
        .delete(schema.connectedFinancialAccounts)
        .where(eq(schema.connectedFinancialAccounts.userId, user.id));

      return NextResponse.json({ success: true, message: "Consent revoked successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to revoke consent:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
