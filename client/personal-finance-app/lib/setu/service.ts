import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { normalizeSetuData } from "./normalizer";
import { setuProvider } from "./client";

function mapConsentStatus(status: string) {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
      return "APPROVED" as const;
    case "REJECTED":
      return "REJECTED" as const;
    case "REVOKED":
      return "REVOKED" as const;
    case "EXPIRED":
      return "EXPIRED" as const;
    default:
      return "PENDING" as const;
  }
}

function mapSessionStatus(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "COMPLETED" as const;
    case "EXPIRED":
      return "EXPIRED" as const;
    case "FAILED":
      return "FAILED" as const;
    default:
      return "PENDING" as const;
  }
}

export async function processConsentNotification(payload: {
  consentId: string;
  status?: string;
  error?: { code?: string; message?: string } | null;
  data?: { status?: string; detail?: { accounts?: Array<Record<string, unknown>> } } | null;
}) {
  const status = payload.data?.status ?? payload.status;
  if (!status) return;

  await db
    .update(schema.setuConsents)
    .set({
      status: mapConsentStatus(status),
      rawPayload: payload,
      updatedAt: new Date(),
    })
    .where(eq(schema.setuConsents.consentId, payload.consentId));
}

export async function createSessionForConsent(consentId: string) {
  const [consent] = await db
    .select()
    .from(schema.setuConsents)
    .where(eq(schema.setuConsents.consentId, consentId))
    .limit(1);
  if (!consent || consent.status !== "APPROVED") return null;

  const [existing] = await db
    .select()
    .from(schema.setuDataSessions)
    .where(eq(schema.setuDataSessions.consentId, consentId))
    .limit(1);
  if (existing) return existing;
  if (!consent.dataRangeFrom || !consent.dataRangeTo) return null;

  const upstream = await setuProvider.createDataSession({
    consentId,
    from: consent.dataRangeFrom.toISOString(),
    to: consent.dataRangeTo.toISOString(),
  });
  const [session] = await db
    .insert(schema.setuDataSessions)
    .values({
      consentId,
      sessionId: upstream.id,
      status: mapSessionStatus(upstream.status),
    })
    .returning();
  return session;
}

export async function importSessionData(sessionId: string) {
  const [session] = await db
    .select({
      dataSession: schema.setuDataSessions,
      consent: schema.setuConsents,
    })
    .from(schema.setuDataSessions)
    .innerJoin(
      schema.setuConsents,
      eq(schema.setuConsents.consentId, schema.setuDataSessions.consentId),
    )
    .where(eq(schema.setuDataSessions.sessionId, sessionId))
    .limit(1);
  if (!session) return null;

  const payload = await setuProvider.fetchDataSession(sessionId);
  const normalized = normalizeSetuData(payload);
  const imported = await db.transaction(async (tx) => {
    let inserted = 0;
    for (const account of normalized.accounts) {
      const [storedAccount] = await tx
        .insert(schema.connectedFinancialAccounts)
        .values({
          userId: session.consent.userId,
          fipId: account.fipId,
          fipName: account.fipName,
          setuConsentId: session.consent.consentId,
          setuLinkRefNumber: account.linkRefNumber,
          maskedAccountNumber: account.maskedAccountNumber,
          accountType: account.accountType,
        })
        .onConflictDoUpdate({
          target: [
            schema.connectedFinancialAccounts.userId,
            schema.connectedFinancialAccounts.setuLinkRefNumber,
          ],
          set: {
            fipId: account.fipId,
            fipName: account.fipName,
            maskedAccountNumber: account.maskedAccountNumber,
            accountType: account.accountType,
          },
        })
        .returning({ id: schema.connectedFinancialAccounts.id });
      if (!storedAccount) continue;

      const accountTransactions = normalized.transactions.filter(
        (transaction) => transaction.setuAccountId === account.linkRefNumber,
      );
      for (const transaction of accountTransactions) {
        const result = await tx
          .insert(schema.transactions)
          .values({
            userId: session.consent.userId,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            financialBucket: transaction.financialBucket,
            merchant: transaction.merchant,
            description: transaction.description,
            transactionDate: transaction.transactionDate,
            source: "ACCOUNT_AGGREGATOR",
            setuAccountId: account.linkRefNumber,
            setuTransactionId: transaction.setuTransactionId,
          })
          .onConflictDoNothing({
            target: [
              schema.transactions.setuAccountId,
              schema.transactions.setuTransactionId,
            ],
          })
          .returning({ id: schema.transactions.id });
        inserted += result.length;
      }
    }

    await tx
      .update(schema.setuDataSessions)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(schema.setuDataSessions.sessionId, sessionId));
    return inserted;
  });

  return imported;
}

export async function getOwnedConsent(userId: string, consentId: string) {
  const [consent] = await db
    .select()
    .from(schema.setuConsents)
    .where(and(eq(schema.setuConsents.userId, userId), eq(schema.setuConsents.consentId, consentId)))
    .limit(1);
  return consent;
}
