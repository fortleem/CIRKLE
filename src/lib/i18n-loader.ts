/**
 * i18n Locale Pack Loader — Blueprint §2.6.
 *
 * Cirkle ships 7 locale packs (en, ar, fr, es, tr, ur, hi). Each pack is a
 * JSON file under `src/lib/locale-packs/<code>.json` that contains every
 * user-facing UI string (greeting, tabs, buttons, sections, onboarding,
 * nav, home, ai, palette, sponsored, upcoming…).
 *
 * This module is intentionally **isomorphic** (no `"server-only"`, no
 * Prisma import) so it can be consumed from server routes, Edge middleware,
 * React client components, and the onboarding flow alike. The packs are
 * imported statically — that means `LOCALE_PACKS` is available
 * synchronously on both the server and the client without any network
 * round-trip. (For huge future translation tables, `loadLocalePack`
 * below shows the dynamic-import upgrade path.)
 */

import enJson from "./locale-packs/en.json";
import arJson from "./locale-packs/ar.json";
import frJson from "./locale-packs/fr.json";
import esJson from "./locale-packs/es.json";
import trJson from "./locale-packs/tr.json";
import urJson from "./locale-packs/ur.json";
import hiJson from "./locale-packs/hi.json";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical Cirkle locale codes (ISO 639-1 with macrolanguage fallbacks). */
export type LocaleCode = "en" | "ar" | "fr" | "es" | "tr" | "ur" | "hi";

/**
 * The shape of every locale pack — derived from the English reference.
 *
 * Note: we widen the literal-typed `dir` field to `"ltr" | "rtl"` so the
 * other packs (whose `dir` may be `"rtl"`) satisfy the same type.
 */
type EnPack = typeof enJson;
export type LocalePack = Omit<EnPack, "dir"> & { dir: "ltr" | "rtl" };

/** Direction-of-text hint surfaced to <html dir=…> from the active pack. */
export type TextDirection = "ltr" | "rtl";

// ─────────────────────────────────────────────────────────────────────────────
// Pack registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synchronous registry of every loaded pack. Used by `getPack` and the
 * back-compat shim re-exported from `@/lib/i18n`. New locales are added
 * by dropping another `<code>.json` file into `locale-packs/` and adding
 * a single entry here.
 */
export const LOCALE_PACKS: Record<LocaleCode, LocalePack> = {
  en: enJson as LocalePack,
  ar: arJson as LocalePack,
  fr: frJson as LocalePack,
  es: esJson as LocalePack,
  tr: trJson as LocalePack,
  ur: urJson as LocalePack,
  hi: hiJson as LocalePack,
};

/** All locale codes — useful for iteration / pickers / Accept-Language parsers. */
export const ALL_LOCALES: readonly LocaleCode[] = Object.keys(LOCALE_PACKS) as LocaleCode[];

/** English is the canonical fallback when a translation is missing or the
 *  requested locale is unknown. */
export const DEFAULT_LOCALE: LocaleCode = "en";

// ─────────────────────────────────────────────────────────────────────────────
// Country → locale mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map ISO-2 country code → preferred Cirkle locale. Coverage follows
 * Ethnologue / Wikipedia official-language tables. A country appears
 * under the locale we believe the *majority* of Cirkle users in that
 * country will want — the user can always override in Settings.
 *
 * Countries not listed fall back to English (the `DEFAULT_LOCALE`).
 */
const COUNTRY_TO_LOCALE: Record<string, LocaleCode> = {
  // Arabic — MENA + Arabic-script Africa
  SA: "ar", AE: "ar", EG: "ar", IQ: "ar", JO: "ar", KW: "ar", LB: "ar",
  LY: "ar", MA: "ar", OM: "ar", PS: "ar", QA: "ar", SY: "ar", TN: "ar",
  YE: "ar", BH: "ar", MR: "ar", SD: "ar", DJ: "ar", SO: "ar", KM: "ar",
  EH: "ar",
  // French — France + Francophone Africa + parts of Belgium/Canada/Switz.
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", BL: "fr", MF: "fr", GF: "fr",
  PF: "fr", NC: "fr", WF: "fr", PM: "fr", YT: "fr", RE: "fr", GP: "fr",
  MQ: "fr", HT: "fr", CD: "fr", CG: "fr", CI: "fr", BF: "fr", ML: "fr",
  SN: "fr", GN: "fr", BJ: "fr", TG: "fr", NE: "fr", CM: "fr", GA: "fr",
  TD: "fr", CF: "fr", BI: "fr", RW: "fr", MG: "fr", VU: "fr", CA: "fr",
  CH: "fr",
  // Spanish — Spain + Latin America + Equatorial Guinea
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  UY: "es", PY: "es", BO: "es", CR: "es", CU: "es", DO: "es", EC: "es",
  SV: "es", GT: "es", HN: "es", NI: "es", PA: "es", PR: "es", GQ: "es",
  // Turkish — Turkey + Turkic-speaking CIS
  TR: "tr", CY: "tr", AZ: "tr", TM: "tr", UZ: "tr", KZ: "tr", KG: "tr",
  TJ: "tr",
  // Urdu — Pakistan + Urdu-speaking diaspora
  PK: "ur",
  // Hindi — India + Nepal + Fiji
  IN: "hi", NP: "hi", FJ: "hi",
  // English — UK, US, Anglosphere, English-speaking Africa, default
  GB: "en", US: "en", AU: "en", NZ: "en", IE: "en", ZA: "en", NG: "en",
  KE: "en", GH: "en", UG: "en", TZ: "en", ZW: "en", ZM: "en", BW: "en",
  GM: "en", SL: "en", LR: "en", NA: "en", MW: "en", LS: "en", SZ: "en",
  BB: "en", JM: "en", TT: "en", BS: "en", BZ: "en", GY: "en", IS: "en",
  MT: "en", PH: "en", SG: "en", HK: "en",
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a Cirkle locale from an ISO-2 country code (case-insensitive).
 * Falls back to {@link DEFAULT_LOCALE} when the country is unknown or
 * unmapped.
 *
 * Example: `resolveLocaleFromCountry("SA") → "ar"`
 */
export function resolveLocaleFromCountry(countryCode: string | null | undefined): LocaleCode {
  if (!countryCode) return DEFAULT_LOCALE;
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return DEFAULT_LOCALE;
  return COUNTRY_TO_LOCALE[cc] ?? DEFAULT_LOCALE;
}

/**
 * Resolve a Cirkle locale from an HTTP `Accept-Language` header. Picks the
 * first language tag whose primary subtag matches a known Cirkle locale.
 *
 * Example: `resolveLocaleFromAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8") → "fr"`
 */
export function resolveLocaleFromAcceptLanguage(header: string | null | undefined): LocaleCode {
  if (!header) return DEFAULT_LOCALE;
  const tags = header.split(",").map((t) => t.trim().split(";")[0].trim().toLowerCase());
  for (const tag of tags) {
    if (!tag) continue;
    const primary = tag.split("-")[0] as LocaleCode;
    if ((ALL_LOCALES as readonly string[]).includes(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

/**
 * Get a locale pack synchronously. Falls back to the English pack when
 * the requested locale isn't shipped (so callers never get `undefined`).
 */
export function getPack(locale: string | null | undefined): LocalePack {
  if (locale && (ALL_LOCALES as readonly string[]).includes(locale)) {
    return LOCALE_PACKS[locale as LocaleCode];
  }
  return LOCALE_PACKS[DEFAULT_LOCALE];
}

/**
 * Get the text direction (`ltr` or `rtl`) for a locale. Reads the `dir`
 * field from the pack so each language self-declares its script
 * direction.
 */
export function getDirection(locale: string | null | undefined): TextDirection {
  const dir = getPack(locale).dir;
  return dir === "rtl" ? "rtl" : "ltr";
}

/**
 * Best-effort locale detection for the current request / session.
 *
 * Resolution order:
 *   1. Explicit `locale` hint (e.g. from a `?lang=fr` query string or a
 *      persisted user preference).
 *   2. `country` ISO-2 code → {@link resolveLocaleFromCountry}.
 *   3. `acceptLanguage` header → {@link resolveLocaleFromAcceptLanguage}.
 *   4. {@link DEFAULT_LOCALE}.
 */
export function resolveBestLocale(opts: {
  locale?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): LocaleCode {
  if (opts.locale && (ALL_LOCALES as readonly string[]).includes(opts.locale)) {
    return opts.locale as LocaleCode;
  }
  if (opts.country) {
    const byCountry = resolveLocaleFromCountry(opts.country);
    if (byCountry !== DEFAULT_LOCALE) return byCountry;
  }
  if (opts.acceptLanguage) {
    const byHeader = resolveLocaleFromAcceptLanguage(opts.acceptLanguage);
    if (byHeader !== DEFAULT_LOCALE) return byHeader;
  }
  return DEFAULT_LOCALE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Async dynamic loader (upgrade path for very large packs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asynchronously load a locale pack. Today this is a thin wrapper around
 * the already-loaded synchronous registry (every pack is small and ships
 * in the initial bundle). In the future, when packs grow large enough to
 * warrant code-splitting, the body of this function can be swapped to:
 *
 *   ```ts
 *   const mod = await import(`./locale-packs/${locale}.json`);
 *   return mod.default as LocalePack;
 *   ```
 *
 * …without breaking any caller. The async signature is reserved now so
 * the swap is non-breaking.
 */
export async function loadLocalePack(locale: string | null | undefined): Promise<LocalePack> {
  return getPack(locale);
}

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat: expose the static-parsed typed packs for callers that want
// the exact JSON object without going through the registry.
// ─────────────────────────────────────────────────────────────────────────────

export const en: LocalePack = enJson as LocalePack;
export const ar: LocalePack = arJson as LocalePack;
export const fr: LocalePack = frJson as LocalePack;
export const es: LocalePack = esJson as LocalePack;
export const tr: LocalePack = trJson as LocalePack;
export const ur: LocalePack = urJson as LocalePack;
export const hi: LocalePack = hiJson as LocalePack;
