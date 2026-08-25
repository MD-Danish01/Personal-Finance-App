import axios from "axios";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
const TOKEN_TTL_MS = 55 * 60 * 1000;

export async function getSetuAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const authUrl = process.env.SETU_AUTH_URL;
  const clientId = process.env.SETU_CLIENT_ID;
  const clientSecret = process.env.SETU_CLIENT_SECRET;
  const productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID;

  if (!authUrl || !clientId || !clientSecret || !productInstanceId) {
    throw new Error("Setu auth credentials not configured");
  }

  // Detect if using Cloudflare Worker relay (no /v1/users/login path)
  const isWorkerRelay = authUrl.includes(".workers.dev") || authUrl.includes("cloudflare");

  const endpoint = isWorkerRelay ? authUrl : `${authUrl}/v1/users/login`;
  const payload = isWorkerRelay
    ? {}
    : {
        clientID: clientId,
        grant_type: "client_credentials",
        secret: clientSecret,
      };

  const { data } = await axios.post(
    endpoint,
    payload,
    {
      headers: {
        client: "bridge",
        "x-product-instance-id": productInstanceId,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  if (!data?.access_token) {
    throw new Error("Setu access token was not returned");
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };

  return data.access_token;
}
