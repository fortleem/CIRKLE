/**
 * i18n Locale Pack Loader — Blueprint §2.6.
 *
 * CIRKLE ships 17 locale packs covering every major language region.
 * Each pack is a JSON file under `src/lib/locale-packs/<code>.json`
 * containing 317 user-facing UI strings.
 *
 * Country → locale mapping rules:
 *   - Egypt (EG) → ar (Egyptian colloquial)
 *   - All other Arab countries → ar-formal (Modern Standard Arabic)
 *   - Iran → fa (Persian, RTL)
 *   - Pakistan → ur (Urdu, RTL)
 *   - Rest of world → mapped by official language
 *
 * This module is isomorphic (no "server-only") so it works on server,
 * client, and Edge middleware alike.
 */

import enJson from "./locale-packs/en.json";
import arJson from "./locale-packs/ar.json";
import arFormalJson from "./locale-packs/ar-formal.json";
import frJson from "./locale-packs/fr.json";
import esJson from "./locale-packs/es.json";
import trJson from "./locale-packs/tr.json";
import urJson from "./locale-packs/ur.json";
import hiJson from "./locale-packs/hi.json";
import zhJson from "./locale-packs/zh.json";
import jaJson from "./locale-packs/ja.json";
import itJson from "./locale-packs/it.json";
import deJson from "./locale-packs/de.json";
import ruJson from "./locale-packs/ru.json";
import ptJson from "./locale-packs/pt.json";
import idJson from "./locale-packs/id.json";
import koJson from "./locale-packs/ko.json";
import faJson from "./locale-packs/fa.json";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LocaleCode =
  | "en" | "ar" | "ar-formal" | "fr" | "es" | "tr" | "ur" | "hi"
  | "zh" | "ja" | "it" | "de" | "ru" | "pt" | "id" | "ko" | "fa";

type EnPack = typeof enJson;
export type LocalePack = Omit<EnPack, "dir"> & { dir: "ltr" | "rtl" };
export type TextDirection = "ltr" | "rtl";

// ─────────────────────────────────────────────────────────────────────────────
// Pack registry
// ─────────────────────────────────────────────────────────────────────────────

export const LOCALE_PACKS: Record<LocaleCode, LocalePack> = {
  en: enJson as LocalePack,
  ar: arJson as LocalePack,
  "ar-formal": arFormalJson as LocalePack,
  fr: frJson as LocalePack,
  es: esJson as LocalePack,
  tr: trJson as LocalePack,
  ur: urJson as LocalePack,
  hi: hiJson as LocalePack,
  zh: zhJson as LocalePack,
  ja: jaJson as LocalePack,
  it: itJson as LocalePack,
  de: deJson as LocalePack,
  ru: ruJson as LocalePack,
  pt: ptJson as LocalePack,
  id: idJson as LocalePack,
  ko: koJson as LocalePack,
  fa: faJson as LocalePack,
};

export const ALL_LOCALES: readonly LocaleCode[] = Object.keys(LOCALE_PACKS) as LocaleCode[];
export const DEFAULT_LOCALE: LocaleCode = "en";

// ─────────────────────────────────────────────────────────────────────────────
// Country → locale mapping
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_TO_LOCALE: Record<string, LocaleCode> = {
  // ── Egyptian Arabic — Egypt ONLY ──────────────────────────────────────
  EG: "ar",

  // ── Formal Arabic (MSA) — All other Arab countries ────────────────────
  SA: "ar-formal",  // Saudi Arabia
  AE: "ar-formal",  // United Arab Emirates
  QA: "ar-formal",  // Qatar
  KW: "ar-formal",  // Kuwait
  OM: "ar-formal",  // Oman
  BH: "ar-formal",  // Bahrain
  YE: "ar-formal",  // Yemen
  IQ: "ar-formal",  // Iraq
  JO: "ar-formal",  // Jordan
  LB: "ar-formal",  // Lebanon
  SY: "ar-formal",  // Syria
  PS: "ar-formal",  // Palestine
  LY: "ar-formal",  // Libya
  TN: "ar-formal",  // Tunisia
  DZ: "ar-formal",  // Algeria
  MA: "ar-formal",  // Morocco
  MR: "ar-formal",  // Mauritania
  SD: "ar-formal",  // Sudan
  SS: "ar-formal",  // South Sudan
  DJ: "ar-formal",  // Djibouti
  SO: "ar-formal",  // Somalia
  KM: "ar-formal",  // Comoros
  EH: "ar-formal",  // Western Sahara

  // ── Persian (Farsi) — Iran, Afghanistan, Tajikistan ───────────────────
  IR: "fa",
  AF: "fa",
  TJ: "fa",

  // ── Urdu — Pakistan ───────────────────────────────────────────────────
  PK: "ur",

  // ── Hindi — India, Nepal, Fiji ───────────────────────────────────────
  IN: "hi",
  NP: "hi",
  FJ: "hi",

  // ── Chinese — China, Hong Kong, Taiwan, Singapore, Macau ─────────────
  CN: "zh",
  HK: "zh",
  TW: "zh",
  SG: "zh",
  MO: "zh",

  // ── Japanese — Japan ─────────────────────────────────────────────────
  JP: "ja",

  // ── Korean — South Korea, North Korea ────────────────────────────────
  KR: "ko",
  KP: "ko",

  // ── Turkish — Turkey, Northern Cyprus, Turkic-speaking CIS ───────────
  TR: "tr",
  CY: "tr",
  AZ: "tr",
  TM: "tr",
  UZ: "tr",
  KZ: "tr",
  KG: "tr",

  // ── Russian — Russia, Belarus, Kazakhstan, Kyrgyzstan ────────────────
  RU: "ru",
  BY: "ru",

  // ── German — Germany, Austria, Liechtenstein ─────────────────────────
  DE: "de",
  AT: "de",
  LI: "de",

  // ── Italian — Italy, San Marino, Vatican ─────────────────────────────
  IT: "it",
  SM: "it",
  VA: "it",

  // ── Portuguese — Brazil, Portugal, Angola, Mozambique, etc. ──────────
  BR: "pt",
  PT: "pt",
  AO: "pt",
  MZ: "pt",
  GW: "pt",
  TL: "pt",
  CV: "pt",
  ST: "pt",

  // ── Indonesian — Indonesia ───────────────────────────────────────────
  ID: "id",

  // ── Spanish — Spain + Latin America + Equatorial Guinea ──────────────
  ES: "es",
  MX: "es",
  AR: "es",   // Argentina
  CO: "es",   // Colombia
  CL: "es",   // Chile
  PE: "es",   // Peru
  VE: "es",   // Venezuela
  UY: "es",   // Uruguay
  PY: "es",   // Paraguay
  BO: "es",   // Bolivia
  CR: "es",   // Costa Rica
  CU: "es",   // Cuba
  DO: "es",   // Dominican Republic
  EC: "es",   // Ecuador
  SV: "es",   // El Salvador
  GT: "es",   // Guatemala
  HN: "es",   // Honduras
  NI: "es",   // Nicaragua
  PA: "es",   // Panama
  PR: "es",   // Puerto Rico
  GQ: "es",   // Equatorial Guinea

  // ── French — France + Francophone Africa + Belgium + Canada ──────────
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  BL: "fr",
  MF: "fr",
  GF: "fr",
  PF: "fr",
  NC: "fr",
  WF: "fr",
  PM: "fr",
  YT: "fr",
  RE: "fr",
  GP: "fr",
  MQ: "fr",
  HT: "fr",
  CD: "fr",   // DR Congo
  CG: "fr",   // Congo
  CI: "fr",   // Côte d'Ivoire
  BF: "fr",   // Burkina Faso
  ML: "fr",   // Mali
  SN: "fr",   // Senegal
  GN: "fr",   // Guinea
  BJ: "fr",   // Benin
  TG: "fr",   // Togo
  NE: "fr",   // Niger
  CM: "fr",   // Cameroon
  GA: "fr",   // Gabon
  TD: "fr",   // Chad
  CF: "fr",   // Central African Republic
  BI: "fr",   // Burundi
  RW: "fr",   // Rwanda
  MG: "fr",   // Madagascar
  VU: "fr",   // Vanuatu
  CA: "fr",   // Canada (bilingual — defaults to French for QC, overridden by Accept-Language)
  CH: "fr",   // Switzerland (multilingual — French-speaking majority areas)

  // ── English — UK, US, Anglosphere, English-speaking Africa, default ───
  GB: "en",
  US: "en",
  AU: "en",
  NZ: "en",
  IE: "en",
  ZA: "en",   // South Africa
  NG: "en",   // Nigeria
  KE: "en",   // Kenya
  GH: "en",   // Ghana
  UG: "en",   // Uganda
  TZ: "en",   // Tanzania
  ZW: "en",   // Zimbabwe
  ZM: "en",   // Zambia
  BW: "en",   // Botswana
  GM: "en",   // Gambia
  SL: "en",   // Sierra Leone
  LR: "en",   // Liberia
  NA: "en",   // Namibia
  MW: "en",   // Malawi
  LS: "en",   // Lesotho
  SZ: "en",   // Eswatini
  BB: "en",   // Barbados
  JM: "en",   // Jamaica
  TT: "en",   // Trinidad and Tobago
  BS: "en",   // Bahamas
  BZ: "en",   // Belize
  GY: "en",   // Guyana
  IS: "en",   // Iceland
  MT: "en",   // Malta
  PH: "en",   // Philippines
  HK: "en",   // Hong Kong (bilingual — overridden below if needed)
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function resolveLocaleFromCountry(countryCode: string | null | undefined): LocaleCode {
  if (!countryCode) return DEFAULT_LOCALE;
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return DEFAULT_LOCALE;
  return COUNTRY_TO_LOCALE[cc] ?? DEFAULT_LOCALE;
}

export function resolveLocaleFromAcceptLanguage(header: string | null | undefined): LocaleCode {
  if (!header) return DEFAULT_LOCALE;
  const tags = header.split(",").map((t) => t.trim().split(";")[0].trim().toLowerCase());
  for (const tag of tags) {
    if (!tag) continue;
    const primary = tag.split("-")[0];
    // Direct match (en, fr, es, etc.)
    if ((ALL_LOCALES as readonly string[]).includes(primary)) {
      return primary as LocaleCode;
    }
    // Arabic — check region: ar-eg → ar (Egyptian), ar-sa → ar-formal, etc.
    if (primary === "ar") {
      const region = tag.split("-")[1]?.toUpperCase();
      if (region === "EG") return "ar";
      return "ar-formal";
    }
    // Persian variants (fa-ir, fa-af)
    if (primary === "fa") return "fa";
    // Urdu
    if (primary === "ur") return "ur";
  }
  return DEFAULT_LOCALE;
}

export function getPack(locale: string | null | undefined): LocalePack {
  if (locale && (ALL_LOCALES as readonly string[]).includes(locale)) {
    return LOCALE_PACKS[locale as LocaleCode];
  }
  return LOCALE_PACKS[DEFAULT_LOCALE];
}

export function getDirection(locale: string | null | undefined): TextDirection {
  const dir = getPack(locale).dir;
  return dir === "rtl" ? "rtl" : "ltr";
}

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

export async function loadLocalePack(locale: string | null | undefined): Promise<LocalePack> {
  return getPack(locale);
}

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat: static-pack exports
// ─────────────────────────────────────────────────────────────────────────────

export const en: LocalePack = enJson as LocalePack;
export const ar: LocalePack = arJson as LocalePack;
export const fr: LocalePack = frJson as LocalePack;
export const es: LocalePack = esJson as LocalePack;
export const tr: LocalePack = trJson as LocalePack;
export const ur: LocalePack = urJson as LocalePack;
export const hi: LocalePack = hiJson as LocalePack;
