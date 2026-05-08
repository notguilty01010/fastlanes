import { headers } from "next/headers";

/**
 * Возвращает абсолютный публичный URL приложения.
 *
 * На проде задаётся через `AUTH_URL` (тот же, что у Auth.js — мы не плодим переменные).
 * В dev'е fallback'аемся на заголовки запроса (host + x-forwarded-proto), чтобы
 * QR-код корректно работал, если открыли страницу с другого устройства в локалке.
 */
export async function getPublicUrl(): Promise<string> {
  const fromEnv = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
