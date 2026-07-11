"use client";
import { useMemo } from "react";
import { useApp } from "@/lib/app-store";
import { getCountry, getDefaultCountry } from "@/lib/countries";
export interface LocationContext { country: string; city: string; countryInfo: ReturnType<typeof getCountry>; flag: string; countryName: string; currency: string; isRTL: boolean; locationLabel: string; locationShort: string; }
export function useLocation(): LocationContext {
  const { country, city, locale } = useApp();
  return useMemo(() => { const countryCode = (country || getDefaultCountry()).toUpperCase(); const countryInfo = getCountry(countryCode); const effectiveCity = city || countryInfo.capital; return { country: countryCode, city: effectiveCity, countryInfo, flag: countryInfo.flag, countryName: countryInfo.name, currency: countryInfo.currency, isRTL: locale === "ar", locationLabel: `${countryInfo.flag} ${effectiveCity}, ${countryInfo.name}`, locationShort: `${countryInfo.flag} ${effectiveCity}` }; }, [country, city, locale]);
}
export function useLocationContext(): string { const loc = useLocation(); return useMemo(() => { const c = loc.countryInfo; return [`User is in ${loc.city}, ${c.name} (${c.code}).`, `Currency: ${c.currency}.`, c.newsSources.length > 0 ? `Real news sources: ${c.newsSources.map((s) => s.name).join(", ")}.` : "", c.landmarks.length > 0 ? `Real landmarks: ${c.landmarks.join(", ")}.` : ""].filter(Boolean).join(" "); }, [loc]); }
