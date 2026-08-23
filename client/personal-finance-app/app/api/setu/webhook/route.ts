import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { fetchFIData } from "@/lib/setu/data-session";

export async function POST(req: Request) {
  const event = await req.json();

  const eventId =
    event.eventId ?? event.id ?? event.traceId ?? JSON.stringify(event);

  const existing = await db
    .select({ id: schema.setuWebhookEvents.id })
    .from(schema.setuWebhookEvents)
    .where(eq(schema.setuWebhookEvents.eventId, eventId))
    .limit(1);

  if (existing.length > 0) {
    return Response.json({ ok: true, message: "Duplicate event" });
  }

  const eventType = event.type ?? event.eventType ?? "UNKNOWN";

  await db.insert(schema.setuWebhookEvents).values({
    eventId,
    eventType,
    payload: event,
    processed: false,
  });

  try {
    if (
      eventType.includes("CONSENT") &&
      (event.status === "APPROVED" || event.consentStatus === "APPROVED")
    ) {
      const consentId = event.consentId ?? event.data?.consentId;
      const userId = event.userId ?? event.data?.userId;

      if (consentId && userId) {
        await db
          .update(schema.setuConsents)
          .set({ status: "APPROVED", updatedAt: new Date() })
          .where(eq(schema.setuConsents.consentId, consentId));

        const { createDataSession } = await import("@/lib/setu/data-session");
        await createDataSession(consentId, userId);
      }
    }

    if (eventType.includes("FI") || eventType.includes("SESSION")) {
      const sessionId = event.sessionId ?? event.data?.sessionId;
      const userId = event.userId ?? event.data?.userId;
      const combinedStatus = event.status ?? event.combinedStatus;

      if (sessionId && userId && (combinedStatus === "COMPLETED" || combinedStatus === "PARTIAL")) {
        await fetchFIData(sessionId, userId);
      }
    }

    await db
      .update(schema.setuWebhookEvents)
      .set({ processed: true })
      .where(eq(schema.setuWebhookEvents.eventId, eventId));
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  return Response.json({ ok: true });
}
