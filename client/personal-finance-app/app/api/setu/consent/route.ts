import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getConsent } from "@/lib/setu/consent";
import { createDataSession, fetchFIData } from "@/lib/setu/data-session";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    let latestConsent = await db.query.setuConsents.findFirst({
      where: eq(schema.setuConsents.userId, user.id),
      orderBy: [desc(schema.setuConsents.createdAt)],
    });

    // If status is PENDING, verify live status directly from Setu API
    if (latestConsent && latestConsent.status === "PENDING") {
      try {
        const liveConsent = await getConsent(latestConsent.consentId);
        const liveStatus = (
          liveConsent.status ??
          liveConsent.consentStatus ??
          ""
        ).toUpperCase();

        if (liveStatus === "APPROVED" || liveStatus === "ACTIVE") {
          await db
            .update(schema.setuConsents)
            .set({ status: "APPROVED", updatedAt: new Date() })
            .where(eq(schema.setuConsents.id, latestConsent.id));

          latestConsent = { ...latestConsent, status: "APPROVED" };

          // Automatically trigger data session and account/transaction sync
          try {
            const session = await createDataSession(
              latestConsent.consentId,
              user.id,
            );
            const sessionId = session.id ?? session.sessionId;
            if (sessionId) {
              await fetchFIData(sessionId, user.id);
            }
          } catch (sessionErr) {
            console.error("Auto session creation on GET consent error:", sessionErr);
          }
        } else if (liveStatus === "REJECTED" || liveStatus === "REVOKED") {
          await db
            .update(schema.setuConsents)
            .set({ status: liveStatus, updatedAt: new Date() })
            .where(eq(schema.setuConsents.id, latestConsent.id));

          latestConsent = { ...latestConsent, status: liveStatus };
        }
      } catch (err) {
        console.error("Error querying Setu live consent status:", err);
      }
    }

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
  } catch (error) {
    console.error("Failed to get consent info:", error);
    return NextResponse.json(
      { consent: null, accounts: [] },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { action, consentId } = body;

    // Action 1: Revoke consent & unlink accounts
    if (action === "revoke" && consentId) {
      await db
        .update(schema.setuConsents)
        .set({ status: "REVOKED", updatedAt: new Date() })
        .where(eq(schema.setuConsents.consentId, consentId));

      await db
        .delete(schema.connectedFinancialAccounts)
        .where(eq(schema.connectedFinancialAccounts.userId, user.id));

      return NextResponse.json({
        success: true,
        message: "Consent revoked and accounts disconnected",
      });
    }

    // Action 2: Manual Sync / Check Status
    if (action === "sync" && consentId) {
      const consent = await db.query.setuConsents.findFirst({
        where: eq(schema.setuConsents.consentId, consentId),
      });

      if (!consent) {
        return NextResponse.json({ error: "Consent not found" }, { status: 404 });
      }

      let currentStatus = consent.status;
      try {
        const liveConsent = await getConsent(consentId);
        const liveStatus = (
          liveConsent.status ??
          liveConsent.consentStatus ??
          ""
        ).toUpperCase();

        if (liveStatus === "APPROVED" || liveStatus === "ACTIVE") {
          currentStatus = "APPROVED";
          await db
            .update(schema.setuConsents)
            .set({ status: "APPROVED", updatedAt: new Date() })
            .where(eq(schema.setuConsents.id, consent.id));

          // Trigger data session fetch
          const session = await createDataSession(consentId, user.id);
          const sessionId = session.id ?? session.sessionId;
          if (sessionId) {
            await fetchFIData(sessionId, user.id);
          }
        }
      } catch (err) {
        console.error("Manual sync Setu error:", err);
      }

      const updatedAccounts = await db.query.connectedFinancialAccounts.findMany({
        where: eq(schema.connectedFinancialAccounts.userId, user.id),
      });

      return NextResponse.json({
        success: true,
        status: currentStatus,
        accounts: updatedAccounts,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process consent action:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
