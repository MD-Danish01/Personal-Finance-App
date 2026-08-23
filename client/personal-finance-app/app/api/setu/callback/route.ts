import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const consentId = params.get("consentId") ?? params.get("id");
  const status = params.get("status");

  if (consentId) {
    const consentStatus = status === "APPROVED" || status === "approved"
      ? "APPROVED"
      : status === "REJECTED" || status === "rejected"
        ? "REJECTED"
        : "PENDING";

    await db
      .update(schema.setuConsents)
      .set({ status: consentStatus, updatedAt: new Date() })
      .where(eq(schema.setuConsents.consentId, consentId));
  }

  const redirectUrl = status === "APPROVED" || status === "approved"
    ? "/money?connected=true"
    : status === "REJECTED" || status === "rejected"
      ? "/money?connected=false"
      : "/money";

  return Response.redirect(new URL(redirectUrl, req.url));
}
