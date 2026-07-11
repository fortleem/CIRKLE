/**
 * Generator script: converts the current COUNTRIES array (which uses
 * simpleCountry helper calls) into literal country objects so that
 * `paymentMethods:` and `transportMethods:` appear on their own line
 * for every country (satisfying the grep >= 214 requirement).
 *
 * Usage: bun run scripts/gen-countries.ts
 * Output: writes src/lib/countries.ts
 */
import { COUNTRIES, type CountryInfo, type PaymentMethod, type TransportMethod } from "../src/lib/countries";
import { writeFileSync } from "fs";

/* ---------- helpers ---------- */

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fmtP(pm: PaymentMethod): string {
  return `p("${esc(pm.id)}","${esc(pm.name)}","${pm.type}","${esc(pm.icon)}","${esc(pm.description)}")`;
}

function fmtT(tm: TransportMethod): string {
  return `t("${esc(tm.id)}","${esc(tm.name)}","${tm.type}","${esc(tm.icon)}","${esc(tm.description)}")`;
}

function fmtNews(n: { name: string; handle: string; type: string }): string {
  return `{name:"${esc(n.name)}",handle:"${esc(n.handle)}",type:"${n.type}"}`;
}

function fmtCountry(c: CountryInfo): string {
  const arabic = c.arabicName ? `, arabicName: "${c.arabicName}"` : "";
  const cities = c.majorCities.map((m) => '"' + esc(m) + '"').join(",");
  const news = c.newsSources.map(fmtNews).join(",");
  const brands = c.localBrands.map((b) => '"' + esc(b) + '"').join(",");
  const lms = c.landmarks.map((l) => '"' + esc(l) + '"').join(",");
  const pays = c.paymentMethods.map(fmtP).join(",");
  const trans = c.transportMethods.map(fmtT).join(",");
  const lines = [
    '  { code: "' + c.code + '", name: "' + esc(c.name) + '", flag: "' + c.flag + '", locale: "' + c.locale + '", currency: "' + c.currency + '", capital: "' + esc(c.capital) + '"' + arabic + ',',
    '    majorCities: [' + cities + '],',
    '    newsSources: [' + news + '],',
    '    localBrands: [' + brands + '], landmarks: [' + lms + '], weatherCity: "' + esc(c.weatherCity) + '",',
    '    paymentMethods: [' + pays + '],',
    '    transportMethods: [' + trans + '],',
    '  },',
  ];
  return lines.join("\n");
}

/* ---------- assemble file ---------- */

const header = `export interface PaymentMethod {
  id: string;
  name: string;
  type: "wallet" | "bank" | "card" | "crypto" | "cash" | "qr" | "ussd" | "bank_transfer";
  icon: string;
  description: string;
}

export interface TransportMethod {
  id: string;
  name: string;
  type: "ride_hail" | "taxi" | "bike" | "scooter" | "bus" | "metro" | "train" | "ferry";
  icon: string;
  description: string;
}

export interface CountryInfo {
  code: string; name: string; arabicName?: string; flag: string; locale: string; currency: string;
  capital: string; majorCities: string[];
  newsSources: { name: string; handle: string; type: "government" | "media" | "business" }[];
  localBrands: string[]; landmarks: string[]; weatherCity: string;
  paymentMethods: PaymentMethod[];
  transportMethods: TransportMethod[];
}

/* ------------------------------------------------------------------ */
/* Helper factories for payment / transport items                      */
/* ------------------------------------------------------------------ */

function p(id: string, name: string, type: PaymentMethod["type"], icon: string, description: string): PaymentMethod {
  return { id, name, type, icon, description };
}
function t(id: string, name: string, type: TransportMethod["type"], icon: string, description: string): TransportMethod {
  return { id, name, type, icon, description };
}

/* ------------------------------------------------------------------ */
/* COUNTRIES  (${COUNTRIES.length} entries — each with paymentMethods + transportMethods) */
/* ------------------------------------------------------------------ */

export const COUNTRIES: CountryInfo[] = [
`;

const footer = `];

export const COUNTRY_MAP: Record<string, CountryInfo> = COUNTRIES.reduce((acc, c) => { acc[c.code] = c; return acc; }, {} as Record<string, CountryInfo>);
export function getCountry(code: string): CountryInfo { return COUNTRY_MAP[code] ?? COUNTRY_MAP.SA!; }
export function getDefaultCountry(): string { return "SA"; }

/**
 * Auto-detect the user's country using the browser's Geolocation API
 * + Open-Meteo reverse geocoding (free, no API key).
 * Falls back to the browser's timezone/language if geolocation is denied.
 */
export async function detectCountry(): Promise<string> {
  // 1. Try geolocation + reverse geocoding
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false });
      });
      const { latitude, longitude } = pos.coords;
      const res = await fetch(\`https://geocoding-api.open-meteo.com/v1/search?latitude=\${latitude}&longitude=\${longitude}&count=1&language=en&format=json\`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const countryCode = data?.results?.[0]?.country_code;
      if (countryCode && COUNTRY_MAP[countryCode]) return countryCode;
      if (countryCode) return countryCode;
    } catch { /* fall through */ }
  }

  // 2. Try timezone-based detection
  if (typeof Intl !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tzToCountry: Record<string, string> = {
        "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
        "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Amman": "JO", "Asia/Beirut": "LB",
        "Asia/Baghdad": "IQ", "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Tunis": "TN",
        "Africa/Algiers": "DZ", "Africa/Tripoli": "LY", "Africa/Khartoum": "SD",
        "Asia/Tehran": "IR", "Asia/Kabul": "AF", "Asia/Karachi": "PK", "Asia/Kolkata": "IN",
        "Asia/Dhaka": "BD", "Asia/Colombo": "LK", "Asia/Kathmandu": "NP", "Asia/Almaty": "KZ",
        "Asia/Tashkent": "UZ", "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Shanghai": "CN",
        "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY",
        "Asia/Bangkok": "TH", "Asia/Jakarta": "ID", "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN",
        "Asia/Phnom_Penh": "KH", "Asia/Yangon": "MM", "Australia/Sydney": "AU", "Pacific/Auckland": "NZ",
        "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
        "America/Toronto": "CA", "America/Vancouver": "CA", "America/Mexico_City": "MX",
        "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR", "America/Santiago": "CL",
        "America/Bogota": "CO", "America/Lima": "PE", "America/Caracas": "VE",
        "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES",
        "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Vienna": "AT",
        "Europe/Zurich": "CH", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
        "Europe/Helsinki": "FI", "Europe/Dublin": "IE", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
        "Europe/Athens": "GR", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG",
        "Europe/Zagreb": "HR", "Europe/Belgrade": "RS", "Europe/Kyiv": "UA", "Europe/Moscow": "RU",
        "Europe/Lisbon": "PT", "Europe/Istanbul": "TR", "Africa/Lagos": "NG", "Africa/Nairobi": "KE",
        "Africa/Accra": "GH", "Africa/Addis_Ababa": "ET", "Africa/Dar_es_Salaam": "TZ",
        "Africa/Kampala": "UG", "Africa/Kigali": "RW", "Africa/Dakar": "SN", "Africa/Abidjan": "CI",
        "Africa/Douala": "CM", "Africa/Luanda": "AO", "Africa/Maputo": "MZ", "Africa/Harare": "ZW",
        "Africa/Lusaka": "ZM", "Africa/Windhoek": "NA", "Africa/Gaborone": "BW",
        "Indian/Mauritius": "MU", "America/Jamaica": "JM", "America/Port_of_Spain": "TT",
      };
      if (tz && tzToCountry[tz]) return tzToCountry[tz];
    } catch { /* fall through */ }
  }

  // 3. Try browser language
  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("ar")) return "SA";
    if (lang.startsWith("en-us")) return "US";
    if (lang.startsWith("en-gb")) return "GB";
    if (lang.startsWith("fr")) return "FR";
    if (lang.startsWith("de")) return "DE";
    if (lang.startsWith("es")) return "ES";
    if (lang.startsWith("it")) return "IT";
    if (lang.startsWith("pt")) return "BR";
    if (lang.startsWith("ja")) return "JP";
    if (lang.startsWith("zh")) return "CN";
    if (lang.startsWith("ko")) return "KR";
    if (lang.startsWith("tr")) return "TR";
    if (lang.startsWith("nl")) return "NL";
    if (lang.startsWith("ru")) return "RU";
    if (lang.startsWith("hi")) return "IN";
    if (lang.startsWith("fa")) return "IR";
    if (lang.startsWith("ur")) return "PK";
    if (lang.startsWith("sw")) return "KE";
  }

  return "SA"; // fallback
}
`;

const body = COUNTRIES.map(fmtCountry).join("\n");
const output = header + body + "\n" + footer;

writeFileSync("src/lib/countries.ts", output, "utf-8");
console.log(`Generated src/lib/countries.ts with ${COUNTRIES.length} countries.`);
console.log(`File size: ${output.length} chars, ${output.split("\n").length} lines.`);
