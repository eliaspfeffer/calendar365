type PayPalTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type PayPalEnv = "sandbox" | "live";

export function getPayPalEnv(): PayPalEnv {
  const raw = (Deno.env.get("PAYPAL_ENV") ?? "live").toLowerCase().trim();
  return raw === "sandbox" ? "sandbox" : "live";
}

export function getPayPalApiBase() {
  const explicit = Deno.env.get("PAYPAL_API_BASE")?.trim();
  if (explicit) return explicit;
  return getPayPalEnv() === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function getPayPalAccessToken() {
  const clientId = requiredEnv("PAYPAL_CLIENT_ID");
  const secret = requiredEnv("PAYPAL_SECRET");
  const auth = btoa(`${clientId}:${secret}`);

  const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PayPal token error: ${res.status} ${body}`);
  }

  const json = (await res.json()) as PayPalTokenResponse;
  if (!json.access_token) throw new Error("PayPal token missing access_token");
  return json.access_token;
}

export async function paypalFetch<T>(path: string, init: RequestInit) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${getPayPalApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (null as T);
  if (!res.ok) {
    throw new Error(`PayPal API error: ${res.status} ${text}`);
  }
  return data;
}

