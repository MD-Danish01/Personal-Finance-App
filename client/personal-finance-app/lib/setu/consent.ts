import { setuClient } from "./client";
import { db, schema } from "@/lib/db";

export interface CreateConsentParams {
  userId: string;
  vua: string;
  dataRangeFrom: string;
  dataRangeTo: string;
}

export interface CreateConsentResult {
  consentId: string;
  consentUrl: string;
  status: string;
}

export async function createConsent(
  params: CreateConsentParams,
): Promise<CreateConsentResult> {
  const payload = {
    vua: params.vua,
    dataRange: {
      from: params.dataRangeFrom,
      to: params.dataRangeTo,
    },
    consentDuration: { unit: "MONTH", value: 4 },
    fetchType: "PERIODIC",
    consentTypes: ["PROFILE", "SUMMARY", "TRANSACTIONS"],
    fiTypes: ["DEPOSIT"],
    consentMode: "STORE",
    dataLife: { unit: "MONTH", value: 1 },
    frequency: { unit: "MONTH", value: 30 },
    purpose: {
      code: "102",
      text: "Customer spending patterns, budget or other reportings",
      category: { type: "Personal Finance" },
      refUri: "https://api.rebit.org.in/aa/purpose/102.xml",
    },
    redirectUrl: process.env.SETU_CONNECT_REDIRECT_URL,
    context: [],
    additionalParams: { tags: [] },
  };

  const { data } = await setuClient.post("/v2/consents", payload);

  await db.insert(schema.setuConsents).values({
    userId: params.userId,
    consentId: data.id ?? data.consentId,
    status: "PENDING",
    consentUrl: data.url ?? data.consentUrl,
    dataRangeFrom: new Date(params.dataRangeFrom),
    dataRangeTo: new Date(params.dataRangeTo),
    consentExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    rawPayload: data,
  });

  return {
    consentId: data.id ?? data.consentId,
    consentUrl: data.url ?? data.consentUrl,
    status: data.status ?? "PENDING",
  };
}

export async function getConsent(requestId: string) {
  const { data } = await setuClient.get(
    `/v2/consents/${encodeURIComponent(requestId)}`,
  );
  return data;
}

export async function revokeConsent(requestId: string) {
  const { data } = await setuClient.post(
    `/v2/consents/${encodeURIComponent(requestId)}/revoke`,
  );
  return data;
}
