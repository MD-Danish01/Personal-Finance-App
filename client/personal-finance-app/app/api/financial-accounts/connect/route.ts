import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { setuProvider } from "@/lib/setu/client";
import { consentRequestSchema } from "@/lib/setu/validation";

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
    const parsed = consentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const redirectUrl = process.env.SETU_CONNECT_REDIRECT_URL;
    if (!redirectUrl) {
      return Response.json({ error: "Setu integration is not configured" }, { status: 500 });
    }
    const consent = await setuProvider.createConsent({
      ...parsed.data,
      redirectUrl,
    });
    if (!consent?.id || !consent?.url || !consent?.status) {
      return Response.json({ error: "Setu request failed" }, { status: 502 });
    }

    await db.insert(schema.setuConsents).values({
      userId: session.user.id,
      consentId: consent.id,
      status: "PENDING",
      consentUrl: consent.url,
      purposeCode: parsed.data.purpose.code,
      dataRangeFrom: new Date(parsed.data.dataRange.from),
      dataRangeTo: new Date(parsed.data.dataRange.to),
    });

    return Response.json(
      { success: true, consentId: consent.id, consentUrl: consent.url, status: "PENDING" },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
