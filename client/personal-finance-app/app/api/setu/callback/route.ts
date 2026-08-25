import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getConsent } from "@/lib/setu/consent";
import { createDataSession, fetchFIData } from "@/lib/setu/data-session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const consentId = params.get("consentId") ?? params.get("id");
  const statusParam = params.get("status");
  const successParam = params.get("success");
  const errorParam = params.get("error");

  let isApproved =
    statusParam?.toUpperCase() === "APPROVED" ||
    successParam === "true" ||
    successParam === "1";

  const isRejected =
    statusParam?.toUpperCase() === "REJECTED" ||
    errorParam !== null ||
    successParam === "false";

  if (consentId) {
    // Look up consent in DB
    const consent = await db.query.setuConsents.findFirst({
      where: eq(schema.setuConsents.consentId, consentId),
    });

    if (consent) {
      // Query Setu directly to verify live status if not explicit in query params
      try {
        const liveConsent = await getConsent(consentId);
        const liveStatus = (liveConsent.status ?? liveConsent.consentStatus ?? "").toUpperCase();
        if (liveStatus === "APPROVED" || liveStatus === "ACTIVE") {
          isApproved = true;
        } else if (liveStatus === "REJECTED" || liveStatus === "REVOKED") {
          isApproved = false;
        }
      } catch (err) {
        console.error("Could not fetch live consent status from Setu:", err);
      }

      const finalStatus = isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING";

      await db
        .update(schema.setuConsents)
        .set({ status: finalStatus, updatedAt: new Date() })
        .where(eq(schema.setuConsents.consentId, consentId));

      // If approved, trigger data session immediately
      if (isApproved && consent.userId) {
        try {
          const session = await createDataSession(consentId, consent.userId);
          const sessionId = session.id ?? session.sessionId;
          if (sessionId) {
            // Attempt initial data fetch
            setTimeout(async () => {
              try {
                await fetchFIData(sessionId, consent.userId);
              } catch (e) {
                console.error("Delayed FI fetch attempt error:", e);
              }
            }, 1500);
          }
        } catch (sessionErr) {
          console.error("Failed to auto-create data session after callback:", sessionErr);
        }
      }
    }
  }

  const redirectUrl = isApproved
    ? "/plan?connected=true"
    : isRejected
      ? "/plan?connected=false"
      : "/plan";

  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL;
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const baseUrl = configuredBaseUrl ?? `${forwardedProto}://${forwardedHost}`;

  return Response.redirect(new URL(redirectUrl, baseUrl));
}
