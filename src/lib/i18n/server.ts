import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchAcceptLanguage, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";

/** Locale for public pages: explicit cookie choice, then browser preference. */
export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const headerStore = await headers();
  return matchAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getI18n(locale?: Locale): Promise<{ locale: Locale; t: Messages }> {
  const resolved = locale ?? (await getRequestLocale());
  return { locale: resolved, t: getMessages(resolved) };
}
