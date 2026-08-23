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

  if (!authUrl || !clientId || !clientSecret) {
    throw new Error("Setu auth credentials not configured");
  }

  const { data } = await axios.post(
    `${authUrl}/v1/users/login`,
    {
      clientID: clientId,
      grant_type: "client_credentials",
      secret: clientSecret,
    },
    {
      headers: {
        client: "bridge",
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
