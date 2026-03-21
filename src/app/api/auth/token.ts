// In-memory token cache (good enough for a single-server demo)
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getCustomerToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(process.env.GBG_PING_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GBG_CLIENT_ID!,
      client_secret: process.env.GBG_CLIENT_SECRET!,
      grant_type: "password",
      username: process.env.GBG_USERNAME!,
      password: process.env.GBG_PASSWORD!,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Authentication failed: ${res.status} — ${error}`);
  }

  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}
