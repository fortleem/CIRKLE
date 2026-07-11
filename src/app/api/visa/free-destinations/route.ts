import { NextResponse } from "next/server";
import { checkVisaRequirement } from "@/lib/visa-service";
import { COUNTRY_MAP } from "@/lib/countries";

const POPULAR_DESTINATIONS = ["AE","QA","KW","BH","OM","TR","EG","JO","MA","TN","DZ","LB","IQ","SY","YE","PS","LY","SD","MR","DJ","KM","GA","GN","ML","BF","BJ","CI","NE","TG","MZ","TR","MY","ID","TH","MV","SG","HK","PH","VN","KH","LA","MM","BN","TL","NP","LK","BD","BT","FJ","WS","TO","SB","VU","MU","SC","BR","AR","CL","PE","CO","EC","UY","PY","BO","VE","CR","PA","BZ","GT","HN","NI","SV","DO","HT","JM","BS","BB","TT","GD","LC","VC","AG","DM","KN","GB","IE","FR","DE","IT","ES","NL","BE","AT","CH","SE","NO","DK","FI","IS","PT","GR","PL","CZ","HU","RO","HR","SI","SK","EE","LV","LT","BG","ME","RS","AL","MK","BA","XK","US","CA","MX","AU","NZ","ZA","KE","TZ","NG","GH","CM","SN","ET","GE","AM","AZ","MD","RU","UA","BY","MN","CN","IN","PK","JP","KR","TW"];

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const passport = (url.searchParams.get("passport") || "SA").toUpperCase();
  const cacheKey = `visa-free:${passport}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return NextResponse.json(cached.data);

  const destinations = POPULAR_DESTINATIONS.filter(c => c !== passport);
  const results = await Promise.all(destinations.map(d => checkVisaRequirement(passport, d).catch(() => null)));

  const visaFree: any[] = []; const visaOnArrival: any[] = []; const eVisa: any[] = []; const embassyRequired: any[] = [];
  for (const r of results) {
    if (!r) continue;
    const countryInfo = COUNTRY_MAP[r.destinationCountry];
    const entry = { code: r.destinationCountry, name: countryInfo?.name || r.destinationCountry, flag: countryInfo?.flag || "🏳️", arabicName: countryInfo?.arabicName || "", maxStayDays: r.maxStayDays, notes: r.notes, processingTime: r.processingTime, fee: r.fee };
    if (r.visaType === "visa-free") visaFree.push(entry);
    else if (r.visaType === "visa-on-arrival") visaOnArrival.push(entry);
    else if (r.visaType === "e-visa") eVisa.push(entry);
    else embassyRequired.push(entry);
  }
  const data = { passport, visaFree, visaOnArrival, eVisa, embassyRequired };
  cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
  return NextResponse.json(data);
}
