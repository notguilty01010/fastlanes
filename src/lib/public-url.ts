import { headers } from "next/headers";

// На проде берём AUTH_URL. В dev'е - заголовки запроса, чтобы QR-код работал
// при открытии страницы с другого устройства в локалке.
export async function getPublicUrl(): Promise<string> {
  const fromEnv = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
