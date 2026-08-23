import { setuClient } from "./client";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { normalizeFIData, saveTransactions } from "./normalizer";

export async function createDataSession(consentId: string, userId: string) {
  void userId;
  const consent = await db.query.setuConsents.findFirst({
    where: eq(schema.setuConsents.consentId, consentId),
  });

  if (!consent) {
    throw new Error(`Consent ${consentId} not found in DB`);
  }

  const { data } = await setuClient.post("/v2/sessions", {
    consentId,
    dataRange: {
      from: consent.dataRangeFrom?.toISOString() ?? new Date().toISOString(),
      to: consent.dataRangeTo?.toISOString() ?? new Date().toISOString(),
    },
    format: "json",
  });

  await db.insert(schema.setuDataSessions).values({
    consentId,
    sessionId: data.id ?? data.sessionId,
    status: "PENDING",
  });

  return data;
}

export async function fetchFIData(sessionId: string, userId: string) {
  const { data } = await setuClient.get(
    `/v2/sessions/${encodeURIComponent(sessionId)}`,
  );

  const combinedStatus = data.status ?? data.combinedStatus ?? "PENDING";

  if (combinedStatus === "COMPLETED" || combinedStatus === "PARTIAL") {
    const normalized = normalizeFIData(data, userId);
    await saveTransactions(normalized);
  }

  if (combinedStatus === "COMPLETED") {
    await db
      .update(schema.setuDataSessions)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(schema.setuDataSessions.sessionId, sessionId));
  }

  return data;
}
