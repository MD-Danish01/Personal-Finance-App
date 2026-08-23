import type {
  FinancialDataProvider,
  SetuConsentRequest,
  SetuConsentResponse,
  SetuDataSessionResponse,
} from "./types";

class SetuProviderError extends Error {}

let cachedToken: { value: string; expiresAt: number } | null = null;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new SetuProviderError("Setu integration is not configured");
  return value;
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new SetuProviderError("Setu request failed");
  return body;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`${requiredEnv("SETU_AUTH_URL")}/v1/users/login`, {
    method: "POST",
    headers: { client: "bridge", "Content-Type": "application/json" },
    body: JSON.stringify({
      clientID: requiredEnv("SETU_CLIENT_ID"),
      grant_type: "client_credentials",
      secret: requiredEnv("SETU_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });
  const body = await parseResponse(response);
  if (typeof body?.access_token !== "string") {
    throw new SetuProviderError("Setu token was not returned");
  }

  cachedToken = {
    value: body.access_token,
    // Setu's token response does not expose an expiry in the documented contract.
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  return cachedToken.value;
}

async function requestSetu(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("x-product-instance-id", requiredEnv("SETU_PRODUCT_INSTANCE_ID"));
  headers.set("Content-Type", "application/json");

  return parseResponse(
    await fetch(`${requiredEnv("SETU_BASE_URL")}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    }),
  );
}

export class SetuFinancialDataProvider implements FinancialDataProvider {
  async createConsent(payload: SetuConsentRequest): Promise<SetuConsentResponse> {
    return requestSetu("/v2/consents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createDataSession(input: {
    consentId: string;
    from: string;
    to: string;
  }): Promise<SetuDataSessionResponse> {
    return requestSetu("/v2/sessions", {
      method: "POST",
      body: JSON.stringify({
        consentId: input.consentId,
        dataRange: { from: input.from, to: input.to },
        format: "json",
      }),
    });
  }

  async fetchDataSession(sessionId: string) {
    return requestSetu(`/v2/sessions/${encodeURIComponent(sessionId)}`);
  }

  async listFips() {
    return requestSetu("/v2/fips?status=ACTIVE");
  }
}

export const setuProvider = new SetuFinancialDataProvider();
