/**
 * Localization dictionary for Cirkle (دواير).
 *
 * This file is a back-compat shim that preserves the original `dict` /
 * `Locale` exports used throughout the codebase (`dict[locale].home`,
 * `dict[locale].nav`, …) while delegating to the new locale-pack loader
 * (Blueprint §2.6). All UI strings now live in
 * `src/lib/locale-packs/<code>.json` and are surfaced through
 * {@link getDictionary} below.
 *
 * Back-compat invariants:
 *   • `dict` still has `en` + `ar` keys with the original nested shape
 *     (`appName`, `tagline`, `onboarding`, `nav`, `home`, `ai`, `palette`)
 *     so existing call sites like `dict[locale].home.hello` keep working.
 *   • `dict` ALSO now exposes the new locales (`fr`, `es`, `tr`, `ur`,
 *     `hi`) so new call sites can read non-English / non-Arabic strings
 *     with the same `dict[locale].home.hello` pattern.
 *   • `Locale` is widened to include all 7 locale codes.
 *   • `getDictionary(locale)` and `loadDictionary(locale)` are new helpers
 *     that always return a full pack (with English fallback) — preferred
 *     for new code.
 */

import {
  LOCALE_PACKS,
  ALL_LOCALES,
  DEFAULT_LOCALE,
  getPack,
  loadLocalePack,
  resolveLocaleFromCountry,
  resolveLocaleFromAcceptLanguage,
  resolveBestLocale,
  type LocaleCode,
  type LocalePack,
  type TextDirection,
} from "@/lib/i18n-loader";

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every locale the UI can render. Widened from the original `"en" | "ar"`
 * union to include `fr`, `es`, `tr`, `ur`, `hi` (Blueprint §2.6).
 */
export type Locale = LocaleCode;

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat dictionary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Back-compat dictionary keyed by locale code. Mirrors the original
 * `dict.en` / `dict.ar` shape AND adds the new locales.
 *
 * Existing code paths (e.g. `dict[locale].home`, `dict[locale].nav`) keep
 * working unchanged because the pack JSONs include the same `home`, `nav`,
 * `onboarding`, `ai`, `palette`, `appName`, `tagline` fields.
 */
export const dict: Record<Locale, LocalePack> = LOCALE_PACKS;

// ─────────────────────────────────────────────────────────────────────────────
// New helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synchronously get a full locale pack. Falls back to English when the
 * requested locale is unknown. Preferred over `dict[locale]` for new code
 * because the fallback is explicit.
 *
 *   const t = getDictionary("fr").home.hello;     // "Bonsoir"
 *   const t = getDictionary("klingon").home.hello; // "Good evening" (English fallback)
 */
export function getDictionary(locale: string | null | undefined): LocalePack {
  return getPack(locale);
}

/**
 * Asynchronously load a locale pack — used by code paths that want to
 * code-split packs in the future. Today it just resolves from the
 * already-loaded registry, but the async signature is reserved so a
 * future swap to dynamic `import()` is non-breaking.
 */
export async function loadDictionary(locale: string | null | undefined): Promise<LocalePack> {
  return loadLocalePack(locale);
}

/** Re-export the locale resolver helpers so callers can `import { … } from "@/lib/i18n"`. */
export {
  ALL_LOCALES,
  DEFAULT_LOCALE,
  resolveLocaleFromCountry,
  resolveLocaleFromAcceptLanguage,
  resolveBestLocale,
  getPack,
  loadLocalePack,
};

/** Re-export the direction helper for components that set `<html dir>`. */
export function getDirection(locale: string | null | undefined): TextDirection {
  const dir = getPack(locale).dir;
  return dir === "rtl" ? "rtl" : "ltr";
}

export type { LocaleCode, LocalePack, TextDirection };
