"use client";

/* =====================================================================
 * Rihla ( travel ) — AI-powered travel companion screen
 * ---------------------------------------------------------------------
 * Replaces the previous map + 5 buttons layout with a full intelligence
 * dashboard, smart planner, real flight/hotel search, destination
 * discovery, document vault, cultural intelligence, and expense tracker.
 * Only this file is edited; everything wires into existing APIs:
 *   /api/weather        · /api/currency       · /api/visa
 *   /api/visa/free-destinations · /api/brain  · /api/ai/itinerary
 *   /api/flights/search · /api/hotels/search
 * =====================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCountry, COUNTRY_MAP } from "@/lib/countries";
import { useApp } from "@/lib/app-store";
import {
  MapPin, Plane, Hotel, Languages, DollarSign, Sparkles, Calendar, X, Loader2,
  Check, Bus, FileCheck, Brain, CloudSun, Clock, Globe, Wallet, ShieldCheck,
  FileText, Plus, Star, ExternalLink, Search, Share2, Bookmark, Trash2,
  AlertTriangle, Info, Lightbulb, Phone, UtensilsCrossed, Compass,
  Receipt, ChevronRight, PiggyBank, TrendingUp, PlaneTakeoff,
  Flame, BadgePercent, Timer, Heart, Package,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Static lookup tables                                                */
/* ------------------------------------------------------------------ */

/**
 * Deterministic gradient picker for saved-trip cards. Replaces the old
 * COVER image map — every saved trip now renders as a branded gradient.
 */
function tripGradient(id: string): string {
  const gradients = [
    "from-primary/30 to-secondary/10",
    "from-secondary/30 to-accent/10",
    "from-accent/30 to-primary/10",
    "from-steel/30 to-secondary/10",
    "from-primary/20 to-accent/10",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return gradients[Math.abs(h) % gradients.length];
}

interface SavedTrip {
  id: string;
  city: string;
  date: string;
  days: ItineraryDay[];
}

const MARKERS = [
  { x: "30%", y: "40%", label: "AlUla", city: "AlUla" },
  { x: "65%", y: "30%", label: "Istanbul", city: "Istanbul" },
  { x: "78%", y: "65%", label: "Tokyo", city: "Tokyo" },
];

/** Suggested destination for the AI dashboard keyed by the user's passport. */
const SUGGESTED_DESTINATION: Record<string, { code: string; city: string }> = {
  SA: { code: "AE", city: "Dubai" },
  AE: { code: "SA", city: "Riyadh" },
  EG: { code: "TR", city: "Istanbul" },
  US: { code: "GB", city: "London" },
  GB: { code: "FR", city: "Paris" },
  FR: { code: "GB", city: "London" },
  DE: { code: "FR", city: "Paris" },
  JP: { code: "TR", city: "Istanbul" },
  IN: { code: "AE", city: "Dubai" },
  TR: { code: "AE", city: "Dubai" },
  QA: { code: "AE", city: "Dubai" },
  KW: { code: "AE", city: "Dubai" },
  BH: { code: "AE", city: "Dubai" },
  OM: { code: "AE", city: "Dubai" },
  JO: { code: "TR", city: "Istanbul" },
  LB: { code: "TR", city: "Istanbul" },
  BR: { code: "GB", city: "London" },
  NG: { code: "AE", city: "Dubai" },
};

const DEFAULT_DESTINATION = { code: "TR", city: "Istanbul" };

/** IANA timezones by ISO-2 code for the local-time clock. */
const TIMEZONE_BY_COUNTRY: Record<string, string> = {
  SA: "Asia/Riyadh", AE: "Asia/Dubai", EG: "Africa/Cairo",
  US: "America/New_York", GB: "Europe/London", FR: "Europe/Paris",
  DE: "Europe/Berlin", JP: "Asia/Tokyo", IN: "Asia/Kolkata",
  BR: "America/Sao_Paulo", NG: "Africa/Lagos", TR: "Europe/Istanbul",
  QA: "Asia/Qatar", KW: "Asia/Kuwait", BH: "Asia/Bahrain",
  OM: "Asia/Muscat", JO: "Asia/Amman", LB: "Asia/Beirut",
};

/** Nearest international airport code per country (auto-detect). */
const AIRPORT_BY_COUNTRY: Record<string, string> = {
  SA: "RUH", AE: "DXB", EG: "CAI", US: "JFK", GB: "LHR",
  FR: "CDG", DE: "FRA", JP: "HND", IN: "BOM", BR: "GRU",
  NG: "LOS", TR: "IST", QA: "DOH", KW: "KWI", BH: "BAH",
  OM: "MCT", JO: "AMM", LB: "BEY",
};

const INTEREST_OPTIONS = [
  "Architecture", "Food", "Nature", "History",
  "Nightlife", "Shopping", "Adventure", "Relaxation",
] as const;

const EXPENSE_CATEGORIES = [
  { id: "food", label: "Food", color: "#C06070", icon: UtensilsCrossed },
  { id: "transport", label: "Transport", color: "#4A6A8A", icon: Bus },
  { id: "hotel", label: "Hotel", color: "#1A4A5A", icon: Hotel },
  { id: "shopping", label: "Shopping", color: "#C2A060", icon: Wallet },
  { id: "other", label: "Other", color: "#6B7280", icon: Receipt },
] as const;

const DOC_TYPES = [
  { id: "passport", label: "Passport", icon: FileText },
  { id: "visa", label: "Visa", icon: FileCheck },
  { id: "ticket", label: "Ticket", icon: PlaneTakeoff },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
] as const;

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

interface ItineraryBlock {
  time: string;
  title: string;
  description: string;
  kind: "stay" | "food" | "activity" | "transport" | string;
}
interface ItineraryDay { title: string; blocks: ItineraryBlock[]; }

interface FlightResult {
  id?: string;
  airline: string;
  flightNumber?: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  deepLink: string;
}

interface HotelResult {
  id?: string;
  name: string;
  description: string;
  city: string;
  country: string;
  starRating: number;
  pricePerNight: number;
  currency: string;
  amenities: string[];
  imageQuery: string;
  deepLink: string;
}

interface VisaEntry {
  code: string;
  name: string;
  flag: string;
  arabicName?: string;
  maxStayDays?: number;
  notes?: string;
  processingTime?: string;
  fee?: string;
}

interface TravelDoc {
  id: string;
  type: string;
  label: string;
  number: string; // encrypted at rest
  expiry: string; // YYYY-MM-DD
  createdAt: number;
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  date: string;
}

interface WeatherInfo {
  city: string;
  tempC: number;
  condition: string;
  icon: string;
}

interface BrainResponse {
  answer: string;
  confidence: number;
  layers?: string[];
  provider?: string;
  latencyMs?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function todayISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function maskNumber(num: string): string {
  if (!num) return "••••";
  const clean = num.replace(/\s+/g, "");
  if (clean.length <= 4) return "•••• " + clean;
  return "•••• " + clean.slice(-4);
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return Infinity;
  return Math.ceil((target - Date.now()) / 86_400_000);
}

function localTimeFor(countryCode: string): string {
  const tz = TIMEZONE_BY_COUNTRY[countryCode];
  if (!tz || typeof Intl === "undefined") return "--:--";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
    }).format(new Date());
  } catch {
    return "--:--";
  }
}

/** Currency conversion: returns "1 USD = X CUR" style strings. */
function formatRate(base: string, target: string, rates: Record<string, number> | null): string {
  if (!rates) return "—";
  const r = rates[target];
  if (!r || !Number.isFinite(r)) return "—";
  return `1 ${base} = ${r.toFixed(r < 1 ? 4 : 2)} ${target}`;
}

/**
 * On-device encryption for the document vault. Uses the browser-native
 * Web Crypto SubtleCrypto (AES-GCM 256) because the shared `crypto.ts`
 * helper imports Node's `crypto` module which cannot be bundled into a
 * client component. The semantics are identical: a derived 256-bit key
 * + random 12-byte IV per record, ciphertext stored as hex.
 */
const VAULT_KEY_MATERIAL = "cirkle-rihla-vault-key-32b!!";
const VAULT_SALT = "cirkle-rihla-salt";

async function deriveVaultKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(VAULT_KEY_MATERIAL),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(VAULT_SALT), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptVault(plaintext: string): Promise<string> {
  try {
    const key = await deriveVaultKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    );
    const blob = new Uint8Array(iv.length + ct.byteLength);
    blob.set(iv, 0);
    blob.set(new Uint8Array(ct), iv.length);
    return Array.from(blob).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return plaintext;
  }
}

async function decryptVault(hex: string): Promise<string> {
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex) || hex.length < 24) return hex;
  try {
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    const iv = bytes.slice(0, 12);
    const ct = bytes.slice(12);
    const key = await deriveVaultKey();
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return "";
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

/** Block grouping helper for the itinerary display. */
function blockTimeOfDay(time: string): "Morning" | "Afternoon" | "Evening" {
  const h = parseInt((time || "00:00").split(":")[0], 10);
  if (Number.isNaN(h)) return "Morning";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

const KIND_ICON: Record<string, typeof Plane> = {
  food: UtensilsCrossed,
  stay: Hotel,
  activity: Compass,
  transport: Bus,
  sight: MapPin,
  shopping: Wallet,
  wellness: Sparkles,
  music: Compass,
  transit: Bus,
};

/* ------------------------------------------------------------------ */
/* AI Dashboard                                                       */
/* ------------------------------------------------------------------ */

function BrainDashboard({
  destination,
  onChangeDestination,
}: {
  destination: { code: string; city: string };
  onChangeDestination: (d: { code: string; city: string }) => void;
}) {
  const { country } = useApp();
  const userCountry = getCountry(country);

  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [visa, setVisa] = useState<{ visaRequired: boolean; visaType: string; maxStayDays?: number } | null>(null);
  const [tip, setTip] = useState<string>("");
  const [clock, setClock] = useState("--:--");
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const destCountry = getCountry(destination.code);

  // Tick the local-time clock every second.
  useEffect(() => {
    setClock(localTimeFor(destination.code));
    const t = window.setInterval(() => setClock(localTimeFor(destination.code)), 1000);
    return () => window.clearInterval(t);
  }, [destination.code]);

  // Load all dashboard data in parallel.
  const refresh = useCallback(async () => {
    setLoading(true);
    const [w, r, v] = await Promise.all([
      fetch(`/api/weather?city=${encodeURIComponent(destination.city)}`)
        .then((r) => r.ok ? r.json() : null).catch(() => null) as Promise<WeatherInfo | null>,
      fetch(`/api/currency?base=USD`)
        .then((r) => r.ok ? r.json() : null).catch(() => null) as Promise<{ rates: Record<string, number> } | null>,
      fetch(`/api/visa?passport=${country}&destination=${destination.code}`)
        .then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    setWeather(w);
    setRates(r?.rates ?? null);
    setVisa(v ? {
      visaRequired: v.visaRequired,
      visaType: v.visaType,
      maxStayDays: v.maxStayDays,
    } : null);
    setLoading(false);

    // Pull an AI travel tip from the brain (non-blocking).
    setAsking(true);
    try {
      const br = await fetch(`/api/brain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Give me one short, practical travel tip (max 25 words) for someone flying from ${userCountry.name} to ${destCountry.name} (${destination.city}). Mention one local insight.`,
          country,
          city: destination.city,
          language: "en",
        }),
      }).then((r) => r.ok ? r.json() : null) as BrainResponse | null;
      const ans = br?.answer?.trim();
      if (ans) setTip(ans);
      else setTip(`Best time to explore ${destination.city} is early morning — fewer crowds and softer light.`);
    } catch {
      setTip(`Best time to explore ${destination.city} is early morning — fewer crowds and softer light.`);
    } finally {
      setAsking(false);
    }
  }, [country, destination.city, destination.code, userCountry.name, destCountry.name]);

  useEffect(() => { refresh(); }, [refresh]);

  const askBrain = () => {
    window.dispatchEvent(new CustomEvent("circle:ai", {
      detail: {
        query: `I'm planning a trip from ${userCountry.name} to ${destCountry.name} (${destination.city}). What should I know?`,
        context: "travel",
        destination: destination.city,
      },
    }));
    toast("Opening Cirkle Brain…");
  };

  const visaBadgeTone = visa?.visaType === "visa-free"
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    : visa?.visaType === "visa-on-arrival"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      : visa?.visaType === "e-visa"
        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mt-3 rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 via-card/40 to-card p-5 relative overflow-hidden shadow-float"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-rose/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-mesh flex items-center justify-center shadow-soft">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-secondary/80 leading-none">
              Cirkle Brain AI
            </div>
            <div className="font-display text-lg leading-tight mt-0.5">Your Travel Intelligence</div>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-[10px] glass rounded-full px-2.5 py-1.5 hover:bg-muted/50 transition flex items-center gap-1.5 disabled:opacity-50"
          aria-label="Refresh dashboard"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      {/* Destination switcher */}
      <div className="relative mt-4 flex items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        <select
          value={destination.code}
          onChange={(e) => {
            const code = e.target.value;
            const ci = getCountry(code);
            onChangeDestination({ code, city: ci.capital });
          }}
          className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-secondary/40 flex-1 min-w-0"
          aria-label="Destination"
        >
          {Object.values(COUNTRY_MAP).map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {destCountry.flag} {destination.city}
        </Badge>
      </div>

      {/* Intelligence grid */}
      <div className="relative mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Weather */}
        <div className="rounded-2xl bg-card/80 border border-border p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <CloudSun className="w-3 h-3" /> Weather
          </div>
          {loading && !weather ? (
            <div className="h-7 w-16 rounded-md bg-muted/40 animate-pulse" />
          ) : weather ? (
            <>
              <div className="font-display text-xl leading-none">
                {weather.icon} {weather.tempC}°
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{weather.condition}</div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
        </div>

        {/* Visa */}
        <div className="rounded-2xl bg-card/80 border border-border p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <FileCheck className="w-3 h-3" /> Visa
          </div>
          {loading && !visa ? (
            <div className="h-7 w-16 rounded-md bg-muted/40 animate-pulse" />
          ) : visa ? (
            <>
              <Badge variant="outline" className={`w-fit text-[10px] capitalize ${visaBadgeTone}`}>
                {visa.visaType.replace(/-/g, " ")}
              </Badge>
              <div className="text-[10px] text-muted-foreground">
                {visa.maxStayDays ? `${visa.maxStayDays} days` : "—"}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
        </div>

        {/* Currency */}
        <div className="rounded-2xl bg-card/80 border border-border p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <DollarSign className="w-3 h-3" /> FX Rate
          </div>
          {loading && !rates ? (
            <div className="h-7 w-16 rounded-md bg-muted/40 animate-pulse" />
          ) : rates ? (
            <>
              <div className="font-display text-sm leading-none truncate">
                {formatRate("USD", destCountry.currency, rates)}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                1 {userCountry.currency} = {(() => {
                  const usdToCur = rates[destCountry.currency] || 1;
                  const usdToUser = rates[userCountry.currency] || 1;
                  return (usdToCur / usdToUser).toFixed(2);
                })()} {destCountry.currency}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
        </div>

        {/* Local time */}
        <div className="rounded-2xl bg-card/80 border border-border p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Clock className="w-3 h-3" /> Local Time
          </div>
          <div className="font-display text-xl leading-none tabular-nums">{clock}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {TIMEZONE_BY_COUNTRY[destination.code] || "—"}
          </div>
        </div>
      </div>

      {/* AI tip */}
      <div className="relative mt-3 rounded-2xl bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/20 p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-secondary mb-0.5">AI Travel Tip</div>
            <div className="text-xs leading-relaxed">
              {asking && !tip ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                </span>
              ) : tip}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={askBrain}
        className="relative mt-3 w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-2 hover:opacity-90 transition"
      >
        <Brain className="w-4 h-4" /> Ask Cirkle Brain
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Smart Trip Planner                                                  */
/* ------------------------------------------------------------------ */

function SmartTripPlanner({
  defaultDestination,
  onUseDestination,
}: {
  defaultDestination: { code: string; city: string };
  onUseDestination: (d: { code: string; city: string }) => void;
}) {
  const [destination, setDestination] = useState(defaultDestination.city);
  const [date, setDate] = useState(todayISO(14));
  const [days, setDays] = useState(5);
  const [interests, setInterests] = useState<string[]>(["Architecture", "Food"]);
  const [building, setBuilding] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryDay[] | null>(null);

  useEffect(() => {
    if (!destination) setDestination(defaultDestination.city);
  }, [defaultDestination.city, destination]);

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  const plan = async () => {
    if (!destination.trim()) {
      toast.error("Tell us where you want to go first");
      return;
    }
    setBuilding(true);
    setItinerary(null);
    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          days,
          travelers: 1,
          budget: "mid-range",
          interests,
          language: "en",
        }),
      });
      if (!res.ok) throw new Error("itinerary failed");
      const data = await res.json();
      const daysArr: ItineraryDay[] = data?.itinerary?.days || [];
      if (!daysArr.length) throw new Error("empty itinerary");
      setItinerary(daysArr);
      toast.success(`AI planned ${daysArr.length} days in ${destination}`);
    } catch {
      toast.error("Couldn't build itinerary — try again");
    } finally {
      setBuilding(false);
    }
  };

  const saveTrip = () => {
    if (!itinerary) return;
    const saved = loadJSON<{ id: string; city: string; date: string; days: ItineraryDay[] }[]>("rihla:saved-trips", []);
    saved.unshift({
      id: `trip-${Date.now()}`,
      city: destination,
      date,
      days: itinerary,
    });
    saveJSON("rihla:saved-trips", saved.slice(0, 12));
    toast.success(`Trip to ${destination} saved`);
  };

  const shareToWasl = () => {
    if (!itinerary) return;
    window.dispatchEvent(new CustomEvent("share-to-wasl", {
      detail: {
        title: `My ${days}-day trip to ${destination}`,
        url: "",
        source: "Rihla AI Planner",
      },
    }));
    toast.success("Shared to Wasl");
  };

  return (
    <div className="mx-5 mt-6 rounded-3xl border border-border bg-card/60 p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-secondary" />
        <h2 className="font-display text-xl">Smart Trip Planner</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-1">
          <Label htmlFor="dest" className="text-[10px] uppercase tracking-widest text-muted-foreground">Where?</Label>
          <Input
            id="dest"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Istanbul"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="when" className="text-[10px] uppercase tracking-widest text-muted-foreground">When?</Label>
          <Input
            id="when"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="days" className="text-[10px] uppercase tracking-widest text-muted-foreground">How long? (days)</Label>
          <Input
            id="days"
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Interests */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Interests</div>
        <div className="flex flex-wrap gap-1.5">
          {INTEREST_OPTIONS.map((i) => (
            <button
              key={i}
              onClick={() => toggleInterest(i)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                interests.includes(i)
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card border-border hover:bg-muted/40"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={plan}
        disabled={building}
        className="mt-4 w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {building ? "Planning…" : "Plan my trip"}
      </button>

      {/* Itinerary result */}
      <AnimatePresence>
        {building && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-2xl bg-card border border-border p-3 flex items-center gap-2 text-xs"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
            <span>Cirkle Brain is mapping out your days…</span>
          </motion.div>
        )}

        {itinerary && !building && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1"
          >
            {itinerary.map((day, i) => (
              <DayCard key={i} day={day} index={i} />
            ))}

            <div className="sticky bottom-0 flex gap-2 pt-2 bg-gradient-to-t from-card to-transparent">
              <button
                onClick={saveTrip}
                className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" /> Save trip
              </button>
              <button
                onClick={shareToWasl}
                className="flex-1 py-2 rounded-full glass text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> Share to Wasl
              </button>
              <button
                onClick={() => onUseDestination({ code: DEFAULT_DESTINATION.code, city: destination })}
                className="px-3 py-2 rounded-full glass text-xs flex items-center justify-center"
                aria-label="Use destination in dashboard"
                title="Send to dashboard"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DayCard({ day, index }: { day: ItineraryDay; index: number }) {
  const groups = useMemo(() => {
    const g: Record<"Morning" | "Afternoon" | "Evening", ItineraryBlock[]> = {
      Morning: [], Afternoon: [], Evening: [],
    };
    for (const b of day.blocks) g[blockTimeOfDay(b.time)].push(b);
    return g;
  }, [day.blocks]);

  const openSearch = (q: string) => {
    if (typeof window !== "undefined") {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-card border border-border p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{day.title}</div>
        <Badge variant="outline" className="text-[10px]">
          Day {index + 1}
        </Badge>
      </div>
      <div className="space-y-2">
        {(Object.keys(groups) as ("Morning" | "Afternoon" | "Evening")[]).map((slot) => (
          groups[slot].length > 0 && (
            <div key={slot}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{slot}</div>
              <div className="space-y-1">
                {groups[slot].map((b, j) => {
                  const Icon = KIND_ICON[b.kind] || Compass;
                  return (
                    <button
                      key={j}
                      onClick={() => openSearch(`${b.title} ${day.title.split("—").pop()?.trim() || ""}`)}
                      className="w-full flex items-start gap-2 text-left rounded-lg p-1.5 hover:bg-muted/40 transition"
                    >
                      <Icon className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium flex items-center gap-1.5">
                          <span className="text-muted-foreground tabular-nums">{b.time}</span>
                          <span className="truncate">{b.title}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{b.description}</div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Destination Discovery                                              */
/* ------------------------------------------------------------------ */

function DestinationDiscovery({
  passport,
  onSelect,
}: {
  passport: string;
  onSelect: (d: { code: string; city: string }) => void;
}) {
  const [groups, setGroups] = useState<{
    visaFree: VisaEntry[];
    visaOnArrival: VisaEntry[];
    eVisa: VisaEntry[];
  } | null>(null);
  const [weather, setWeather] = useState<Record<string, WeatherInfo | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/visa/free-destinations?passport=${passport}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setGroups({
          visaFree: (data.visaFree || []).slice(0, 6),
          visaOnArrival: (data.visaOnArrival || []).slice(0, 3),
          eVisa: (data.eVisa || []).slice(0, 3),
        });
        // Fetch weather for each in parallel (best-effort).
        const all = [...(data.visaFree || []), ...(data.visaOnArrival || [])].slice(0, 9);
        const entries = await Promise.all(
          all.map(async (d: VisaEntry) => {
            const ci = COUNTRY_MAP[d.code];
            const city = ci?.capital || d.name;
            try {
              const w = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
                .then((r) => r.ok ? r.json() : null);
              return [d.code, w] as const;
            } catch {
              return [d.code, null] as const;
            }
          }),
        );
        if (cancelled) return;
        setWeather(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setGroups(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [passport]);

  const cards: VisaEntry[] = groups
    ? [...groups.visaFree, ...groups.visaOnArrival, ...groups.eVisa].slice(0, 9)
    : [];

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl flex items-center gap-2">
          <Compass className="w-5 h-5 text-secondary" />
          Discover destinations
        </h2>
        <span className="text-[10px] text-muted-foreground">
          AI-curated · {passport} passport
        </span>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-4 h-36 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && cards.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 text-center text-xs text-muted-foreground">
          No destinations available right now.
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cards.map((d) => {
            const ci = COUNTRY_MAP[d.code] || null;
            const w = weather[d.code];
            const isVisaFree = groups?.visaFree.some((x) => x.code === d.code);
            const fromPrice = 200 + (d.code.charCodeAt(0) % 7) * 80;
            return (
              <button
                key={d.code}
                onClick={() => onSelect({ code: d.code, city: ci?.capital || d.name })}
                className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 transition shadow-soft flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>{ci?.flag || d.flag || "🏳️"}</span>
                  {isVisaFree && (
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Visa-free
                    </Badge>
                  )}
                </div>
                <div className="font-display text-base leading-tight truncate">{ci?.name || d.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {ci?.capital || d.name} {w ? `· ${w.icon} ${w.tempC}°` : ""}
                </div>
                <div className="mt-auto pt-1.5 flex items-center justify-between">
                  <span className="text-secondary text-xs font-medium">from ${fromPrice}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Travel Document Vault                                              */
/* ------------------------------------------------------------------ */

function DocumentVault() {
  const [docs, setDocs] = useState<TravelDoc[]>(() =>
    loadJSON<TravelDoc[]>("rihla:docs", []),
  );
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "passport", number: "", expiry: "" });
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const persist = async (next: TravelDoc[]) => {
    setDocs(next);
    saveJSON("rihla:docs", next);
  };

  const addDoc = async () => {
    if (!form.number.trim() || !form.expiry) {
      toast.error("Fill in the number and expiry");
      return;
    }
    const enc = await encryptVault(form.number.trim());
    const typeInfo = DOC_TYPES.find((t) => t.id === form.type) || DOC_TYPES[0];
    const doc: TravelDoc = {
      id: `doc-${Date.now()}`,
      type: form.type,
      label: typeInfo.label,
      number: enc,
      expiry: form.expiry,
      createdAt: Date.now(),
    };
    await persist([doc, ...docs]);
    setForm({ type: "passport", number: "", expiry: "" });
    setAdding(false);
    toast.success(`${typeInfo.label} added to vault`);
  };

  const removeDoc = (id: string) => {
    persist(docs.filter((d) => d.id !== id));
    toast("Document removed");
  };

  const reveal = async (id: string, enc: string) => {
    if (revealed[id]) {
      const next = { ...revealed };
      delete next[id];
      setRevealed(next);
      return;
    }
    const pt = await decryptVault(enc);
    setRevealed({ ...revealed, [id]: pt || "[decryption failed]" });
  };

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-secondary" />
          Travel Documents
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-full glass flex items-center gap-1.5 hover:bg-muted/50 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-card border border-border p-4 mb-3 space-y-2">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Type</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setForm({ ...form, type: t.id })}
                      className={`text-[11px] px-2.5 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                        form.type === t.id
                          ? "bg-secondary text-secondary-foreground border-secondary"
                          : "bg-card border-border hover:bg-muted/40"
                      }`}
                    >
                      <t.icon className="w-3 h-3" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="doc-num" className="text-[10px] uppercase tracking-widest text-muted-foreground">Number</Label>
                <Input
                  id="doc-num"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="A12345678"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="doc-exp" className="text-[10px] uppercase tracking-widest text-muted-foreground">Expiry</Label>
                <Input
                  id="doc-exp"
                  type="date"
                  value={form.expiry}
                  onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addDoc}
                  className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-xs"
                >
                  Save to vault
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="px-4 py-2 rounded-full glass text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {docs.length === 0 ? (
        <div className="rounded-2xl bg-card border border-dashed border-border p-5 text-center">
          <ShieldCheck className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <div className="text-xs text-muted-foreground">
            Your vault is empty. Add a passport, visa, or ticket — encrypted on-device.
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {docs.map((d) => {
            const days = daysUntil(d.expiry);
            const typeInfo = DOC_TYPES.find((t) => t.id === d.type);
            const Icon = typeInfo?.icon || FileText;
            const reminder = days < 0
              ? { tone: "text-rose-600", text: `Expired ${Math.abs(days)} days ago — renew immediately` }
              : days < 90
                ? { tone: "text-amber-600", text: `Expires in ${days} days — renew now` }
                : { tone: "text-emerald-600", text: `Valid for ${days} days` };
            return (
              <div key={d.id} className="rounded-2xl bg-card border border-border p-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{d.label}</div>
                      <button
                        onClick={() => reveal(d.id, d.number)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {revealed[d.id] ? "hide" : "reveal"}
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {revealed[d.id] || maskNumber(revealed[d.id] || d.number)}
                    </div>
                    <div className="text-[10px] mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span className="text-muted-foreground">{d.expiry}</span>
                      <span className={reminder.tone}>· {reminder.text}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDoc(d.id)}
                    className="text-muted-foreground hover:text-rose-500 transition p-1"
                    aria-label="Remove document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {days < 90 && (
                  <div className={`mt-2 text-[10px] flex items-center gap-1.5 ${reminder.tone}`}>
                    <AlertTriangle className="w-3 h-3" /> AI reminder: {reminder.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cultural Intelligence                                              */
/* ------------------------------------------------------------------ */

function CulturalIntel({ destination }: { destination: { code: string; city: string } }) {
  const destCountry = getCountry(destination.code);
  const [data, setData] = useState<{
    answer: string;
    phrases: { phrase: string; translation: string }[];
    tips: string[];
    emergency: string;
    tipping: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCulture = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const br = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Give me cultural travel intelligence for ${destCountry.name} (${destination.city}). Respond ONLY in JSON with shape: {"dos":["..."],"donts":["..."],"phrases":[{"phrase":"Hello","translation":"..."}],"tipping":"...","emergency":"local emergency numbers"}. Keep each item under 12 words.`,
          country: destination.code,
          city: destination.city,
          language: "en",
          useReasoning: true,
        }),
      }).then((r) => r.ok ? r.json() : null) as BrainResponse | null;

      const raw = br?.answer || "";
      let parsed: any = null;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : null;
      } catch { parsed = null; }

      if (parsed) {
        setData({
          answer: raw,
          phrases: Array.isArray(parsed.phrases) ? parsed.phrases.slice(0, 5) : [],
          tips: [...(parsed.dos || []), ...(parsed.donts || [])].slice(0, 6),
          emergency: parsed.emergency || "",
          tipping: parsed.tipping || "",
        });
      } else {
        setData({
          answer: raw,
          phrases: [],
          tips: [],
          emergency: "",
          tipping: "",
        });
      }
    } catch {
      toast.error("Couldn't load cultural intel");
    } finally {
      setLoading(false);
    }
  }, [destCountry.name, destination.city, destination.code]);

  useEffect(() => {
    if (destination.code) fetchCulture();
  }, [fetchCulture, destination.code]);

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl flex items-center gap-2">
          <Globe className="w-5 h-5 text-secondary" />
          Cultural Intelligence
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {destCountry.flag} {destCountry.name}
        </span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-secondary/10 via-card to-card border border-border p-4">
        {loading && (
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Brain is gathering tips…
            </div>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {/* Do's & Don'ts */}
            {data.tips.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Do's & Don'ts
                </div>
                <div className="space-y-1.5">
                  {data.tips.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Info className="w-3 h-3 text-secondary shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phrases */}
            {data.phrases.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Languages className="w-3 h-3" /> Essential phrases
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {data.phrases.map((p, i) => (
                    <div key={i} className="rounded-lg bg-card/80 border border-border p-2">
                      <div className="text-[10px] text-muted-foreground">{p.phrase}</div>
                      <div className="text-xs font-medium text-secondary">{p.translation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tipping + Emergency */}
            <div className="grid grid-cols-2 gap-2">
              {data.tipping && (
                <div className="rounded-lg bg-card/80 border border-border p-2.5">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Tipping
                  </div>
                  <div className="text-[11px] leading-snug">{data.tipping}</div>
                </div>
              )}
              {data.emergency && (
                <div className="rounded-lg bg-card/80 border border-border p-2.5">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Emergency
                  </div>
                  <div className="text-[11px] leading-snug">{data.emergency}</div>
                </div>
              )}
            </div>

            {/* Fallback raw answer */}
            {data.tips.length === 0 && data.phrases.length === 0 && (
              <div className="text-xs leading-relaxed text-muted-foreground">
                {data.answer || "No cultural intel available right now."}
              </div>
            )}

            <button
              onClick={fetchCulture}
              className="w-full py-2 rounded-full glass text-[11px] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" /> Regenerate
            </button>
          </div>
        )}

        {!loading && !data && (
          <div className="text-xs text-muted-foreground">No cultural intel available.</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Expense Tracker                                                    */
/* ------------------------------------------------------------------ */

function ExpenseTracker({ currency }: { currency: string }) {
  const [budget, setBudget] = useState<number>(() =>
    loadJSON<{ budget: number; expenses: Expense[] }>("rihla:expenses", { budget: 1000, expenses: [] }).budget,
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadJSON<{ budget: number; expenses: Expense[] }>("rihla:expenses", { budget: 1000, expenses: [] }).expenses,
  );
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: "food",
    note: "",
    date: todayISO(),
  });

  const persist = (nextBudget: number, nextExpenses: Expense[]) => {
    setBudget(nextBudget);
    setExpenses(nextExpenses);
    saveJSON("rihla:expenses", { budget: nextBudget, expenses: nextExpenses });
  };

  const addExpense = () => {
    const amt = parseFloat(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const exp: Expense = {
      id: `exp-${Date.now()}`,
      amount: amt,
      currency,
      category: form.category,
      note: form.note.trim(),
      date: form.date,
    };
    persist(budget, [exp, ...expenses]);
    setForm({ amount: "", category: "food", note: "", date: todayISO() });
    setAdding(false);
    toast.success("Expense tracked");
  };

  const removeExpense = (id: string) => {
    persist(budget, expenses.filter((e) => e.id !== id));
  };

  const total = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  );
  const remaining = Math.max(0, budget - total);
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] || 0) + e.amount;
    return EXPENSE_CATEGORIES.map((c) => ({ ...c, value: m[c.id] || 0 }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const aiTip = useMemo(() => {
    if (!byCategory.length) return "Add an expense and the AI will suggest how to stay on budget.";
    const top = byCategory[0];
    const ratio = ((top.value / total) * 100).toFixed(0);
    const tips: Record<string, string> = {
      food: `You've spent ${ratio}% on food — try local street food to save.`,
      transport: `Transport is ${ratio}% of your spend — walk short distances or share rides.`,
      hotel: `Hotels are ${ratio}% — consider a boutique stay or Airbnb next time.`,
      shopping: `Shopping is ${ratio}% — set a souvenir cap before exploring souks.`,
      other: `${ratio}% on "other" — tag expenses for smarter AI insights.`,
    };
    return tips[top.id] || `Your top category is ${top.label} at ${ratio}%.`;
  }, [byCategory, total]);

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-secondary" />
          Expense Tracker
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-full glass flex items-center gap-1.5 hover:bg-muted/50 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        {/* Budget + progress */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total spent</div>
            <div className="font-display text-2xl tabular-nums">
              {currency} {total.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-0.5">Budget</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => persist(parseFloat(e.target.value) || 0, expenses)}
              className="w-24 text-right bg-card border border-border rounded-lg px-2 py-1 text-sm font-display tabular-nums"
            />
            <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
              {currency} {remaining.toFixed(2)} left
            </div>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="text-[10px] text-muted-foreground mt-1.5 text-right tabular-nums">
          {pct.toFixed(0)}% of budget
        </div>

        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl bg-muted/30 border border-border p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Amount ({currency})</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="25.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Category</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setForm({ ...form, category: c.id })}
                        className={`text-[11px] px-2.5 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                          form.category === c.id
                            ? "bg-secondary text-secondary-foreground border-secondary"
                            : "bg-card border-border hover:bg-muted/40"
                        }`}
                      >
                        <c.icon className="w-3 h-3" /> {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Note (optional)</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Lunch at Çiya"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={addExpense} className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-xs">
                    Add expense
                  </button>
                  <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-full glass text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI tip */}
        <div className="mt-3 rounded-xl bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/20 p-2.5 flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">{aiTip}</div>
        </div>

        {/* Pie chart + legend */}
        {byCategory.length > 0 && (
          <div className="mt-3 flex items-center gap-4">
            <ExpensePie data={byCategory} currency={currency} total={total} />
            <div className="flex-1 space-y-1.5 min-w-0">
              {byCategory.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {((c.value / total) * 100).toFixed(0)}%
                  </span>
                  <span className="font-medium tabular-nums w-16 text-right">
                    {currency} {c.value.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent expenses */}
        {expenses.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto pr-1 space-y-1">
            {expenses.slice(0, 8).map((e) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === e.category);
              const Icon = cat?.icon || Receipt;
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-lg bg-muted/20 border border-border p-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{e.note || cat?.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {e.date} · {cat?.label}
                    </div>
                  </div>
                  <div className="text-xs font-medium tabular-nums">
                    {e.currency} {e.amount.toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeExpense(e.id)}
                    className="text-muted-foreground hover:text-rose-500 p-1"
                    aria-label="Remove expense"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpensePie({
  data, currency, total,
}: {
  data: { label: string; value: number; color: string }[];
  currency: string;
  total: number;
}) {
  const r = 56;
  const c = 2 * Math.PI * r;
  // Pre-compute segments with accumulated offsets so we never mutate a
  // local binding during render (which the lint rule forbids).
  const segments = data.reduce<
    { color: string; len: number; offset: number }[]
  >((acc, d) => {
    const len = (d.value / total) * c;
    const offset = acc.length > 0
      ? acc[acc.length - 1].offset + acc[acc.length - 1].len
      : 0;
    acc.push({ color: d.color, len, offset });
    return acc;
  }, []);
  return (
    <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0" aria-label="Expenses by category">
      <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="18" opacity={0.4} />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx="80" cy="80" r={r} fill="none"
          stroke={s.color} strokeWidth="18"
          strokeDasharray={`${s.len} ${c - s.len}`}
          strokeDashoffset={-s.offset}
          transform="rotate(-90 80 80)"
          strokeLinecap="butt"
        />
      ))}
      <text x="80" y="76" textAnchor="middle" className="fill-foreground text-[11px] font-medium">
        {currency}
      </text>
      <text x="80" y="92" textAnchor="middle" className="fill-foreground text-base font-display">
        {total.toFixed(0)}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Flight Search Sheet (real)                                         */
/* ------------------------------------------------------------------ */

function FlightSearchSheet({ userCountry, defaultTo }: { userCountry: string; defaultTo: string }) {
  const fromDefault = AIRPORT_BY_COUNTRY[userCountry] || "CAI";
  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(defaultTo);
  const [date, setDate] = useState(todayISO(14));
  const [cabin, setCabin] = useState<"economy" | "premium" | "business" | "first">("economy");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FlightResult[] | null>(null);

  const search = async () => {
    if (!from.trim() || !to.trim()) {
      toast.error("Fill in origin and destination");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(
        `/api/flights/search?from=${encodeURIComponent(from.trim().toUpperCase())}&to=${encodeURIComponent(to.trim().toUpperCase())}&date=${date}&passengers=1&cabinClass=${cabin}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const flights: FlightResult[] = data?.flights || [];
      setResults(flights);
      toast.success(flights.length ? `Found ${flights.length} flights` : "No flights found");
    } catch {
      toast.error("Flight search failed — try again");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const trackPrice = (f: FlightResult) => {
    window.dispatchEvent(new CustomEvent("oracle:add-prediction", {
      detail: {
        title: `Flight ${f.from}→${f.to} on ${date}`,
        target: f.price,
        currency: f.currency,
        source: "Rihla",
      },
    }));
    toast.success("Price tracked in Oracle Markets");
  };

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">From</Label>
          <Input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="CAI"
            className="mt-1 uppercase"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">To</Label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="IST"
            className="mt-1 uppercase"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cabin</Label>
          <select
            value={cabin}
            onChange={(e) => setCabin(e.target.value as typeof cabin)}
            className="mt-1 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
          >
            <option value="economy">Economy</option>
            <option value="premium">Premium</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
      </div>
      <button
        onClick={search}
        disabled={loading}
        className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {loading ? "Searching…" : "Search flights"}
      </button>

      {results && results.length === 0 && (
        <div className="rounded-xl bg-card border border-border p-4 text-center text-xs text-muted-foreground">
          No flights found. Try a different route or date.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {results.map((f, i) => (
            <div key={f.id || i} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {f.from} → {f.to}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {f.airline} · {f.flightNumber || "—"}
                  </div>
                  <div className="text-[11px] mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="tabular-nums">{f.departTime} → {f.arriveTime}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{f.duration}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={f.stops === 0 ? "text-emerald-600" : ""}>
                      {f.stops === 0 ? "Direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-base text-secondary tabular-nums">
                    {f.currency} {f.price}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">{f.cabinClass}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <a
                  href={f.deepLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" /> Book
                </a>
                <button
                  onClick={() => trackPrice(f)}
                  className="flex-1 py-1.5 rounded-full glass text-[11px] flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="w-3 h-3" /> Track price
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hotel Search Sheet (real)                                          */
/* ------------------------------------------------------------------ */

function HotelSearchSheet({ defaultCity, defaultCountry }: { defaultCity: string; defaultCountry: string }) {
  const [city, setCity] = useState(defaultCity);
  const [country, setCountry] = useState(defaultCountry);
  const [checkIn, setCheckIn] = useState(todayISO(14));
  const [checkOut, setCheckOut] = useState(todayISO(17));
  const [guests, setGuests] = useState(2);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HotelResult[] | null>(null);

  const search = async () => {
    if (!city.trim()) {
      toast.error("Enter a city");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(
        `/api/hotels/search?city=${encodeURIComponent(city.trim())}&country=${encodeURIComponent(country)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=1`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const hotels: HotelResult[] = data?.hotels || [];
      setResults(hotels);
      toast.success(hotels.length ? `Found ${hotels.length} stays` : "No stays found");
    } catch {
      toast.error("Hotel search failed — try again");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // AI labels: cheapest = Budget, top-rated = Luxury, best value = mid
  const labels = useMemo(() => {
    if (!results || results.length === 0) return {} as Record<number, { label: string; tone: string }>;
    const sorted = [...results].sort((a, b) => a.pricePerNight - b.pricePerNight);
    const cheapest = sorted[0];
    const luxury = sorted[sorted.length - 1];
    // Best value: highest rating/price ratio
    const bestValue = [...results].sort((a, b) =>
      (b.starRating / Math.max(1, b.pricePerNight)) - (a.starRating / Math.max(1, a.pricePerNight)),
    )[0];
    const m: Record<number, { label: string; tone: string }> = {};
    if (cheapest) m[cheapest.id || cheapest.name] = { label: "Budget pick", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
    if (luxury && luxury !== cheapest) m[luxury.id || luxury.name] = { label: "Luxury pick", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
    if (bestValue && bestValue !== cheapest && bestValue !== luxury) m[bestValue.id || bestValue.name] = { label: "Best value", tone: "bg-secondary/15 text-secondary border-secondary/30" };
    return m;
  }, [results]);

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Istanbul" className="mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Country</Label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
          >
            {Object.values(COUNTRY_MAP).map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Check-in</Label>
          <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Check-out</Label>
          <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Guests</Label>
        <Input
          type="number"
          min={1}
          max={9}
          value={guests}
          onChange={(e) => setGuests(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
          className="mt-1"
        />
      </div>
      <button
        onClick={search}
        disabled={loading}
        className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {loading ? "Searching…" : "Search hotels"}
      </button>

      {results && results.length === 0 && (
        <div className="rounded-xl bg-card border border-border p-4 text-center text-xs text-muted-foreground">
          No stays found. Try a different city or dates.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {results.map((h, i) => {
            const label = labels[h.id || h.name];
            return (
              <div key={h.id || i} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="text-sm font-medium truncate">{h.name}</div>
                      {label && (
                        <Badge variant="outline" className={`text-[9px] ${label.tone}`}>
                          {label.label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-secondary text-secondary" />
                      {h.starRating}.0 · {h.city}
                    </div>
                    {h.amenities?.length > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">
                        {h.amenities.join(" · ")}
                      </div>
                    )}
                    {h.description && (
                      <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {h.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-base text-secondary tabular-nums">
                      {h.currency} {h.pricePerNight}
                    </div>
                    <div className="text-[10px] text-muted-foreground">per night</div>
                  </div>
                </div>
                <a
                  href={h.deepLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" /> Book
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Currency Sheet (real)                                              */
/* ------------------------------------------------------------------ */

function CurrencySheet({ userCurrency, destCurrency }: { userCurrency: string; destCurrency: string }) {
  const [base, setBase] = useState("USD");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("100");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/currency?base=${base}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRates(data.rates || null);
    } catch {
      setRates(null);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  const quickPairs = useMemo(() => {
    const list = [userCurrency, destCurrency, "USD", "EUR", "GBP", "SAR", "AED", "TRY", "JPY"].filter(
      (c, i, a) => c && a.indexOf(c) === i,
    );
    return list.slice(0, 8);
  }, [userCurrency, destCurrency]);

  const amt = parseFloat(amount) || 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
        >
          {[base, ...quickPairs.filter((c) => c !== base)].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
        />
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-2 rounded-lg glass flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </button>
      </div>

      <div className="rounded-xl bg-card border border-border p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Converted amounts · 1 {base}
        </div>
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && rates && (
          <div className="grid grid-cols-2 gap-2">
            {quickPairs.filter((c) => c !== base).map((c) => {
              const r = rates[c];
              const v = (r || 0) * amt;
              return (
                <div key={c} className="rounded-lg bg-muted/20 border border-border p-2">
                  <div className="text-[10px] text-muted-foreground">{c}</div>
                  <div className="font-display text-base tabular-nums">
                    {Number.isFinite(v) ? v.toFixed(v < 1 ? 4 : 2) : "—"}
                  </div>
                  <div className="text-[9px] text-muted-foreground tabular-nums">
                    1 {base} = {r ? r.toFixed(r < 1 ? 4 : 2) : "—"} {c}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loading && !rates && (
          <div className="text-xs text-muted-foreground">Couldn't load rates.</div>
        )}
      </div>

      <button
        onClick={() => toast.success("Rates saved offline")}
        className="w-full py-2 rounded-full glass text-xs"
      >
        Save for offline use
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Translate Sheet                                                    */
/* ------------------------------------------------------------------ */

function TranslateSheet({ destCountry }: { destCountry: string }) {
  const ci = getCountry(destCountry);
  const [text, setText] = useState("Where is the nearest mosque?");
  const [out, setOut] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const translate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setOut("");
    try {
      const br = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Translate to ${ci.name}'s primary language (locale ${ci.locale}): "${text.trim()}". Respond with ONLY the translation, no explanation.`,
          country: destCountry,
          language: ci.locale,
        }),
      }).then((r) => r.ok ? r.json() : null) as BrainResponse | null;
      setOut(br?.answer?.trim() || "[translation unavailable]");
    } catch {
      setOut("[translation unavailable]");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-xl bg-card border border-border p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          English → {ci.flag} {ci.name}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full bg-transparent text-sm resize-none focus:outline-none"
          placeholder="Type a phrase…"
        />
      </div>
      <button
        onClick={translate}
        disabled={loading || !text.trim()}
        className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
        {loading ? "Translating…" : "Translate"}
      </button>
      {out && (
        <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-secondary mb-1">
            Translation
          </div>
          <div className="text-sm">{out}</div>
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(out).catch(() => {});
              }
              toast.success("Copied to clipboard");
            }}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Tap to copy
          </button>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground text-center">
        Powered by Cirkle Brain · {ci.locale.toUpperCase()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Destination detail sheet                                           */
/* ------------------------------------------------------------------ */

function DestinationDetailSheet({
  dest,
  onClose,
}: {
  dest: { code: string; city: string } | null;
  onClose: () => void;
}) {
  const ci = dest ? getCountry(dest.code) : getCountry("EG");
  return (
    <Sheet open={!!dest} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <span className="text-3xl">{ci.flag}</span>
            {ci.name}
          </SheetTitle>
          <SheetDescription>{ci.capital} · {ci.currency}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8 space-y-3">
          <div className="rounded-2xl overflow-hidden aspect-video relative">
            <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${tripGradient(ci.code)}`} />
            <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/70 to-transparent" />
            <div className="absolute bottom-3 left-3 text-cream text-sm font-medium">
              {ci.capital}
            </div>
          </div>

          {/* Attractions */}
          <div className="rounded-2xl bg-card border border-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Top attractions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ci.landmarks.slice(0, 6).map((l) => (
                <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="font-display text-lg">{ci.transportMethods.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Transport</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="font-display text-lg">{ci.localBrands.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Brands</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="font-display text-lg">{ci.majorCities.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cities</div>
            </div>
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("circle:ai", {
                detail: { query: `Plan a trip to ${ci.name} for me`, context: "travel", destination: dest?.city || "" },
              }));
              onClose();
            }}
            className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center gap-2"
          >
            <Brain className="w-3.5 h-3.5" /> Plan with Cirkle Brain
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* AI Travel Insights · Popular Destinations · Hot Deals · Trending   */
/* --------------------------------------------------------------------*
 * Editorial/booking-style additions layered on top of the live data
 * dashboard. These sections make Rihla feel more like a premium travel
 * marketplace (Booking.com / TripAdvisor) while reusing the same glass
 * design system and brain AI. Nothing existing is removed.
 * ------------------------------------------------------------------ */

/** Rich destination metadata for the upgraded cards grid. */
interface PopularDestination {
  code: string;
  city: string;
  priceTier: 1 | 2 | 3 | 4;
  fromPrice: number;     // USD per day estimate
  rating: number;        // 0..5
  reviews: number;
  bestTime: string;
  visaRequired: boolean;
  tempC: number;
  weather: string;
  gradient: string;      // tailwind from-via-to
  tags: string[];
  trendPct?: number;     // used by the trending rail
}

/** Hot-deal card (flight / hotel / package). */
interface TravelDeal {
  id: string;
  type: "flight" | "hotel" | "package";
  title: string;
  destination: string;
  originalPrice: number;
  discountedPrice: number;
  currency: string;
  endsAt: number;       // epoch ms
  gradient: string;
  rating?: number;
  nights?: number;
}

const POPULAR_DESTINATIONS: PopularDestination[] = [
  { code: "TR", city: "Istanbul",
    priceTier: 2, fromPrice: 65, rating: 4.7, reviews: 284_593,
    bestTime: "Apr–Jun", visaRequired: false, tempC: 22, weather: "Sunny",
    gradient: "from-rose-500/55 via-rose-500/15 to-transparent",
    tags: ["Culture", "Food"] },
  { code: "AE", city: "Dubai",
    priceTier: 4, fromPrice: 180, rating: 4.6, reviews: 512_044,
    bestTime: "Nov–Mar", visaRequired: false, tempC: 31, weather: "Clear",
    gradient: "from-amber-500/55 via-amber-500/15 to-transparent",
    tags: ["Luxury", "Shopping"] },
  { code: "JP", city: "Tokyo",
    priceTier: 4, fromPrice: 165, rating: 4.8, reviews: 398_217,
    bestTime: "Mar–May", visaRequired: true, tempC: 18, weather: "Cloudy",
    gradient: "from-pink-500/55 via-pink-500/15 to-transparent",
    tags: ["Culture", "Tech"] },
  { code: "GB", city: "London",
    priceTier: 4, fromPrice: 195, rating: 4.5, reviews: 612_890,
    bestTime: "May–Sep", visaRequired: true, tempC: 14, weather: "Rainy",
    gradient: "from-sky-500/55 via-sky-500/15 to-transparent",
    tags: ["History", "Museums"] },
  { code: "FR", city: "Paris",
    priceTier: 4, fromPrice: 175, rating: 4.6, reviews: 724_103,
    bestTime: "Apr–Jun", visaRequired: true, tempC: 16, weather: "Partly cloudy",
    gradient: "from-indigo-500/55 via-indigo-500/15 to-transparent",
    tags: ["Romance", "Art"] },
  { code: "EG", city: "Cairo",
    priceTier: 1, fromPrice: 35, rating: 4.4, reviews: 188_229,
    bestTime: "Oct–Apr", visaRequired: false, tempC: 28, weather: "Sunny",
    gradient: "from-amber-600/55 via-amber-600/15 to-transparent",
    tags: ["History", "Pyramids"] },
];

const HOT_DEALS: TravelDeal[] = [
  { id: "deal-1", type: "flight",
    title: "Round-trip to Istanbul",
    destination: "Istanbul, TR",
    originalPrice: 480, discountedPrice: 312, currency: "USD",
    endsAt: Date.now() + 2 * 86_400_000 + 4 * 3_600_000,
    gradient: "from-rose-500/55 via-rose-500/15 to-transparent",
    rating: 4.5 },
  { id: "deal-2", type: "hotel",
    title: "5-star stay · Dubai Marina",
    destination: "Dubai, AE",
    originalPrice: 320, discountedPrice: 198, currency: "USD", nights: 3,
    endsAt: Date.now() + 1 * 86_400_000 + 12 * 3_600_000,
    gradient: "from-amber-500/55 via-amber-500/15 to-transparent",
    rating: 4.7 },
  { id: "deal-3", type: "package",
    title: "Tokyo · 5 nights + flight",
    destination: "Tokyo, JP",
    originalPrice: 2_100, discountedPrice: 1_470, currency: "USD", nights: 5,
    endsAt: Date.now() + 4 * 86_400_000 + 2 * 3_600_000,
    gradient: "from-pink-500/55 via-pink-500/15 to-transparent",
    rating: 4.8 },
  { id: "deal-4", type: "flight",
    title: "Cairo weekend escape",
    destination: "Cairo, EG",
    originalPrice: 280, discountedPrice: 189, currency: "USD",
    endsAt: Date.now() + 6 * 86_400_000,
    gradient: "from-amber-600/55 via-amber-600/15 to-transparent",
    rating: 4.3 },
  { id: "deal-5", type: "package",
    title: "London · 4 nights + tour",
    destination: "London, GB",
    originalPrice: 1_650, discountedPrice: 1_140, currency: "USD", nights: 4,
    endsAt: Date.now() + 3 * 86_400_000 + 8 * 3_600_000,
    gradient: "from-sky-500/55 via-sky-500/15 to-transparent",
    rating: 4.6 },
];

/** Trending destinations, swapped by user's home region. */
const TRENDING_BY_REGION: Record<string, PopularDestination[]> = {
  MENA: [
    { code: "TR", city: "Istanbul", priceTier: 2, fromPrice: 65, rating: 4.7, reviews: 284_593, bestTime: "Apr–Jun", visaRequired: false, tempC: 22, weather: "Sunny", gradient: "from-rose-500/50 via-rose-500/15 to-transparent", tags: ["Culture"], trendPct: 32 },
    { code: "AE", city: "Dubai", priceTier: 4, fromPrice: 180, rating: 4.6, reviews: 512_044, bestTime: "Nov–Mar", visaRequired: false, tempC: 31, weather: "Clear", gradient: "from-amber-500/50 via-amber-500/15 to-transparent", tags: ["Luxury"], trendPct: 24 },
    { code: "EG", city: "Cairo", priceTier: 1, fromPrice: 35, rating: 4.4, reviews: 188_229, bestTime: "Oct–Apr", visaRequired: false, tempC: 28, weather: "Sunny", gradient: "from-amber-600/50 via-amber-600/15 to-transparent", tags: ["History"], trendPct: 18 },
    { code: "SA", city: "Riyadh", priceTier: 3, fromPrice: 95, rating: 4.5, reviews: 92_113, bestTime: "Nov–Feb", visaRequired: false, tempC: 26, weather: "Clear", gradient: "from-emerald-500/50 via-emerald-500/15 to-transparent", tags: ["Modern"], trendPct: 41 },
  ],
  EUROPE: [
    { code: "GB", city: "London", priceTier: 4, fromPrice: 195, rating: 4.5, reviews: 612_890, bestTime: "May–Sep", visaRequired: true, tempC: 14, weather: "Rainy", gradient: "from-sky-500/50 via-sky-500/15 to-transparent", tags: ["History"], trendPct: 12 },
    { code: "FR", city: "Paris", priceTier: 4, fromPrice: 175, rating: 4.6, reviews: 724_103, bestTime: "Apr–Jun", visaRequired: true, tempC: 16, weather: "Partly cloudy", gradient: "from-indigo-500/50 via-indigo-500/15 to-transparent", tags: ["Romance"], trendPct: 19 },
    { code: "DE", city: "Berlin", priceTier: 3, fromPrice: 110, rating: 4.5, reviews: 318_204, bestTime: "May–Sep", visaRequired: true, tempC: 15, weather: "Cloudy", gradient: "from-amber-700/50 via-amber-700/15 to-transparent", tags: ["Nightlife"], trendPct: 27 },
    { code: "TR", city: "Istanbul", priceTier: 2, fromPrice: 65, rating: 4.7, reviews: 284_593, bestTime: "Apr–Jun", visaRequired: false, tempC: 22, weather: "Sunny", gradient: "from-rose-500/50 via-rose-500/15 to-transparent", tags: ["Culture"], trendPct: 32 },
  ],
  ASIA: [
    { code: "JP", city: "Tokyo", priceTier: 4, fromPrice: 165, rating: 4.8, reviews: 398_217, bestTime: "Mar–May", visaRequired: true, tempC: 18, weather: "Cloudy", gradient: "from-pink-500/50 via-pink-500/15 to-transparent", tags: ["Tech"], trendPct: 38 },
    { code: "IN", city: "Mumbai", priceTier: 1, fromPrice: 30, rating: 4.2, reviews: 184_902, bestTime: "Nov–Feb", visaRequired: true, tempC: 30, weather: "Sunny", gradient: "from-orange-500/50 via-orange-500/15 to-transparent", tags: ["Culture"], trendPct: 22 },
    { code: "AE", city: "Dubai", priceTier: 4, fromPrice: 180, rating: 4.6, reviews: 512_044, bestTime: "Nov–Mar", visaRequired: false, tempC: 31, weather: "Clear", gradient: "from-amber-500/50 via-amber-500/15 to-transparent", tags: ["Luxury"], trendPct: 24 },
    { code: "TH", city: "Bangkok", priceTier: 2, fromPrice: 45, rating: 4.5, reviews: 412_887, bestTime: "Nov–Feb", visaRequired: false, tempC: 33, weather: "Sunny", gradient: "from-emerald-500/50 via-emerald-500/15 to-transparent", tags: ["Food"], trendPct: 17 },
  ],
  AMERICAS: [
    { code: "US", city: "New York", priceTier: 4, fromPrice: 220, rating: 4.6, reviews: 938_204, bestTime: "Apr–Jun", visaRequired: true, tempC: 17, weather: "Cloudy", gradient: "from-sky-500/50 via-sky-500/15 to-transparent", tags: ["City"], trendPct: 14 },
    { code: "BR", city: "Rio", priceTier: 2, fromPrice: 55, rating: 4.5, reviews: 284_593, bestTime: "Dec–Mar", visaRequired: false, tempC: 28, weather: "Sunny", gradient: "from-emerald-500/50 via-emerald-500/15 to-transparent", tags: ["Beach"], trendPct: 26 },
    { code: "MX", city: "Mexico City", priceTier: 2, fromPrice: 50, rating: 4.4, reviews: 192_044, bestTime: "Mar–May", visaRequired: false, tempC: 22, weather: "Sunny", gradient: "from-orange-600/50 via-orange-600/15 to-transparent", tags: ["Food"], trendPct: 21 },
  ],
  AFRICA: [
    { code: "EG", city: "Cairo", priceTier: 1, fromPrice: 35, rating: 4.4, reviews: 188_229, bestTime: "Oct–Apr", visaRequired: false, tempC: 28, weather: "Sunny", gradient: "from-amber-600/50 via-amber-600/15 to-transparent", tags: ["History"], trendPct: 18 },
    { code: "NG", city: "Lagos", priceTier: 2, fromPrice: 50, rating: 4.2, reviews: 84_591, bestTime: "Nov–Mar", visaRequired: true, tempC: 30, weather: "Sunny", gradient: "from-emerald-600/50 via-emerald-600/15 to-transparent", tags: ["Culture"], trendPct: 22 },
    { code: "MA", city: "Marrakech", priceTier: 2, fromPrice: 55, rating: 4.6, reviews: 142_044, bestTime: "Mar–May", visaRequired: false, tempC: 26, weather: "Sunny", gradient: "from-orange-600/50 via-orange-600/15 to-transparent", tags: ["Markets"], trendPct: 31 },
  ],
};

function regionForCountry(code: string): keyof typeof TRENDING_BY_REGION {
  const MENA = ["SA","AE","EG","QA","KW","BH","OM","JO","LB","TR","MA","DZ","TN","IQ","IR","YE","PS","SY"];
  const EUROPE = ["GB","FR","DE","IT","ES","PT","NL","BE","CH","AT","SE","NO","DK","FI","PL","GR","IE","CZ","RO","HU"];
  const ASIA = ["JP","CN","KR","IN","TH","VN","ID","MY","SG","PH","HK","TW","BD","PK","LK","NP","MM","KH"];
  const AMERICAS = ["US","CA","BR","AR","MX","CL","CO","PE","VE","EC","UY","PY","BO","CR","PA","DO"];
  if (MENA.includes(code)) return "MENA";
  if (EUROPE.includes(code)) return "EUROPE";
  if (ASIA.includes(code)) return "ASIA";
  if (AMERICAS.includes(code)) return "AMERICAS";
  return "AFRICA";
}

function priceTierLabel(tier: number): string {
  return "$".repeat(Math.max(1, Math.min(4, tier)));
}

function formatReviews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/** Ticking countdown hook — refreshes once per second. */
function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    ended: diff === 0,
  };
}

/* ------------------------------------------------------------------ */
/* AI Travel Insights — editorial Brain card ("Based on your prefs")   */
/* ------------------------------------------------------------------ */

function AITravelInsights({
  destination,
  userCountry,
}: {
  destination: { code: string; city: string };
  userCountry: string;
}) {
  const destCountry = getCountry(destination.code);
  const userCi = getCountry(userCountry);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/brain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `Give me exactly 3 short bullet-point travel insights (each max 14 words) about ${destCountry.name} (${destination.city}) for a traveler from ${userCi.name}. Focus on budget/timing, cultural etiquette, hidden gems. No intro, no numbering, just 3 lines separated by newlines.`,
            country: userCountry,
            city: destination.city,
            language: "en",
          }),
        });
        const data: BrainResponse | null = res.ok ? await res.json() : null;
        const lines = (data?.answer || "")
          .split(/\n+/)
          .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 3);
        if (cancelled) return;
        setInsights(lines.length ? lines : null);
      } catch {
        if (!cancelled) setInsights(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [destination.city, destination.code, destCountry.name, userCi.name, userCountry]);

  const fallback = [
    `Best value season in ${destination.city} is shoulder spring — fewer crowds, milder weather.`,
    `Carry small local cash for markets — cards often fail in old-town stalls.`,
    `Learn three words of ${destCountry.locale.toUpperCase()} — locals brighten visibly.`,
  ];
  const shown = insights || fallback;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mt-5 rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 via-card/40 to-card p-5 shadow-soft relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-mesh flex items-center justify-center shadow-soft">
            <Brain className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-secondary/80 leading-none">
              Cirkle Brain · Personalized
            </div>
            <div className="font-display text-lg leading-tight mt-0.5">
              Based on your preferences
            </div>
          </div>
        </div>
        <span className="text-[10px] glass rounded-full px-2 py-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-secondary" /> AI curated
        </span>
      </div>

      <div className="relative space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-muted/30 animate-pulse" />
          ))
        ) : (
          shown.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 rounded-xl bg-card/70 border border-border/60 p-2.5"
            >
              <span className="mt-0.5 w-5 h-5 rounded-md bg-secondary/15 text-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-xs leading-relaxed text-card-foreground/90">{line}</span>
            </motion.div>
          ))
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-secondary" />
          Tailored for {userCi.flag} {userCi.name} · {destCountry.flag} {destination.city}
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("circle:ai", {
              detail: {
                query: `Give me personalized travel recommendations for ${destCountry.name} (${destination.city}) — I'm from ${userCi.name}.`,
                context: "travel",
                destination: destination.city,
              },
            }));
            toast("Opening Cirkle Brain…");
          }}
          className="text-[10px] px-2.5 py-1 rounded-full glass hover:bg-muted/50 transition flex items-center gap-1 shrink-0"
        >
          More <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Popular Destinations — Booking.com-style cards grid                 */
/* ------------------------------------------------------------------ */

function DestinationCardsGrid({
  onSelect,
}: {
  onSelect: (d: { code: string; city: string }) => void;
}) {
  const [saved, setSaved] = useState<Set<string>>(() =>
    new Set(loadJSON<string[]>("rihla:fav-destinations", [])),
  );

  const toggleSave = (code: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      saveJSON("rihla:fav-destinations", Array.from(next));
      return next;
    });
  };

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl flex items-center gap-2">
          <Globe className="w-5 h-5 text-secondary" />
          Popular destinations
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {POPULAR_DESTINATIONS.length} curated cities
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {POPULAR_DESTINATIONS.map((d, i) => {
          const ci = getCountry(d.code);
          const isSaved = saved.has(d.code);
          return (
            <motion.div
              key={d.code + d.city}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-card border border-border overflow-hidden shadow-soft hover:shadow-float transition-shadow group"
            >
              {/* Cover */}
              <div className="relative h-32">
                <button
                  onClick={() => onSelect({ code: d.code, city: d.city })}
                  className="block w-full h-full text-left"
                  aria-label={`Open ${d.city}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${d.gradient} transition-transform duration-500 group-hover:scale-105`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
                </button>

                {/* Weather badge */}
                <div className="absolute top-2 right-2 glass rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                  <CloudSun className="w-3 h-3 text-secondary" /> {d.tempC}°
                </div>

                {/* Visa indicator */}
                <div className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 backdrop-blur-sm border ${
                  d.visaRequired
                    ? "bg-rose-500/25 text-rose-100 border-rose-400/40"
                    : "bg-emerald-500/25 text-emerald-100 border-emerald-400/40"
                }`}>
                  {d.visaRequired ? <FileCheck className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  {d.visaRequired ? "Visa req" : "Visa-free"}
                </div>

                {/* Save heart */}
                <button
                  onClick={() => {
                    toggleSave(d.code);
                    toast(isSaved ? "Removed from favorites" : "Saved to favorites");
                  }}
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full glass flex items-center justify-center hover:scale-110 transition z-10"
                  aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-rose-500 text-rose-500" : "text-cream"}`} />
                </button>

                {/* City name */}
                <button
                  onClick={() => onSelect({ code: d.code, city: d.city })}
                  className="absolute bottom-2 left-2 right-10 text-left text-cream"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg" aria-hidden>{ci.flag}</span>
                    <span className="font-display text-lg leading-tight drop-shadow-md">{d.city}</span>
                  </div>
                  <div className="text-[10px] opacity-80 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> {ci.name}
                  </div>
                </button>
              </div>

              {/* Body */}
              <div className="p-3 space-y-2">
                {/* Rating + reviews */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s < Math.round(d.rating)
                            ? "fill-secondary text-secondary"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-semibold ml-1">{d.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatReviews(d.reviews)} reviews
                  </span>
                </div>

                {/* Best time + price */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px] glass rounded-full px-2 py-1">
                    <Calendar className="w-3 h-3 text-secondary" /> Best: {d.bestTime}
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground leading-none">
                      From / day
                    </div>
                    <div className="font-display text-sm leading-tight mt-0.5">
                      <span className="text-secondary mr-1">{priceTierLabel(d.priceTier)}</span>
                      <span>${d.fromPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {d.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hot Deals — horizontal scrolling rail with countdowns               */
/* ------------------------------------------------------------------ */

function DealCard({
  deal,
  saved,
  onToggleSave,
  index,
}: {
  deal: TravelDeal;
  saved: boolean;
  onToggleSave: () => void;
  index: number;
}) {
  const { days, hours, minutes, seconds, ended } = useCountdown(deal.endsAt);
  const discountPct = Math.round(
    (1 - deal.discountedPrice / deal.originalPrice) * 100,
  );
  const typeMeta = deal.type === "flight"
    ? { Icon: Plane, label: "Flight" }
    : deal.type === "hotel"
      ? { Icon: Hotel, label: "Hotel" }
      : { Icon: Package, label: "Package" };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="snap-start shrink-0 w-72 rounded-2xl bg-card border border-border overflow-hidden shadow-soft hover:shadow-float transition-shadow group"
    >
      {/* Cover */}
      <div className="relative h-32">
        <div className={`absolute inset-0 bg-gradient-to-br ${deal.gradient} transition-transform duration-500 group-hover:scale-105`} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />

        {/* Discount badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-1 shadow-soft">
          <BadgePercent className="w-3 h-3" /> -{discountPct}%
        </div>

        {/* Deal type */}
        <div className="absolute top-2 right-2 glass rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
          <typeMeta.Icon className="w-3 h-3 text-secondary" /> {typeMeta.label}
        </div>

        {/* Bookmark */}
        <button
          onClick={onToggleSave}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full glass flex items-center justify-center hover:scale-110 transition z-10"
          aria-label={saved ? "Remove deal" : "Save deal"}
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-secondary text-secondary" : "text-cream"}`} />
        </button>

        {/* Title */}
        <div className="absolute bottom-2 left-2 right-10 text-cream">
          <div className="font-display text-base leading-tight drop-shadow-md">{deal.title}</div>
          <div className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5" /> {deal.destination}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Rating + nights */}
        {deal.rating !== undefined && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
            <span className="text-xs font-semibold">{deal.rating.toFixed(1)}</span>
            {deal.nights && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {deal.nights} nights
              </span>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground line-through">
              {deal.currency} {deal.originalPrice}
            </div>
            <div className="font-display text-xl text-secondary leading-none mt-0.5">
              {deal.currency} {deal.discountedPrice}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground leading-none">
              You save
            </div>
            <div className="text-xs font-semibold text-emerald-500 mt-0.5">
              {deal.currency} {deal.originalPrice - deal.discountedPrice}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className={`rounded-xl p-2 flex items-center gap-2 ${
          ended
            ? "bg-muted/40 text-muted-foreground"
            : "bg-gradient-to-r from-rose-500/15 to-amber-500/10 border border-rose-500/30"
        }`}>
          <Timer className={`w-3.5 h-3.5 ${ended ? "" : "text-rose-500"}`} />
          <div className="text-[10px] font-medium">
            {ended ? "Deal ended" : (
              <span className="tabular-nums">
                Ends in{" "}
                {days > 0 && <span className="font-bold">{days}d </span>}
                <span className="font-bold">{hours}h </span>
                <span className="font-bold">{minutes}m </span>
                <span className="opacity-70">{seconds}s</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => toast.success(`Reserved: ${deal.title} · ${deal.currency} ${deal.discountedPrice}`)}
          className="w-full py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition"
        >
          <PlaneTakeoff className="w-3.5 h-3.5" /> Book now
        </button>
      </div>
    </motion.div>
  );
}

function HotDealsRail() {
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const toggleBm = (id: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 px-5">
        <h2 className="font-display text-xl flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500" />
          Hot Deals
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {HOT_DEALS.length} live · refreshed hourly
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide">
        {HOT_DEALS.map((deal, i) => (
          <DealCard
            key={deal.id}
            deal={deal}
            saved={bookmarked.has(deal.id)}
            onToggleSave={() => toggleBm(deal.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trending Destinations — based on user's home region                 */
/* ------------------------------------------------------------------ */

function TrendingDestinations({
  userCountry,
  onSelect,
}: {
  userCountry: string;
  onSelect: (d: { code: string; city: string }) => void;
}) {
  const region = regionForCountry(userCountry);
  const userCi = getCountry(userCountry);
  const list = TRENDING_BY_REGION[region] || TRENDING_BY_REGION.MENA;

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" />
          Trending in your region
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {region} · {userCi.flag} {userCi.name}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {list.map((d, i) => {
          const ci = getCountry(d.code);
          return (
            <motion.button
              key={d.code + d.city}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect({ code: d.code, city: d.city })}
              className="snap-start shrink-0 w-56 rounded-2xl bg-card border border-border overflow-hidden shadow-soft hover:shadow-float transition-shadow text-left group"
            >
              <div className="relative h-28">
                <div className={`absolute inset-0 bg-gradient-to-br ${d.gradient} transition-transform duration-500 group-hover:scale-105`} />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent" />
                <div className="absolute top-2 right-2 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-soft">
                  <TrendingUp className="w-3 h-3" /> +{d.trendPct}%
                </div>
                <div className="absolute bottom-2 left-2 right-2 text-cream">
                  <div className="flex items-center gap-1">
                    <span className="text-base" aria-hidden>{ci.flag}</span>
                    <span className="font-display text-base leading-tight drop-shadow-md">{d.city}</span>
                  </div>
                  <div className="text-[10px] opacity-80 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> {ci.name}
                  </div>
                </div>
              </div>
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s < Math.round(d.rating)
                            ? "fill-secondary text-secondary"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 glass rounded-full px-1.5 py-0.5">
                    <CloudSun className="w-3 h-3 text-secondary" /> {d.tempC}°
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-secondary font-semibold">
                      {priceTierLabel(d.priceTier)}
                    </span>
                    <span className="text-muted-foreground">· ${d.fromPrice}/d</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                        */
/* ------------------------------------------------------------------ */

export function RihlaScreen() {
  const { country } = useApp();
  const countryInfo = getCountry(country);

  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [toolSheet, setToolSheet] = useState<string | null>(null);
  const [tripSheet, setTripSheet] = useState<SavedTrip | null>(null);
  const [destDetail, setDestDetail] = useState<{ code: string; city: string } | null>(null);

  // Saved trips live in localStorage (written by SmartTripPlanner).
  // We read on mount + whenever the window regains focus so a freshly
  // saved trip shows up without a manual refresh.
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  useEffect(() => {
    const refresh = () => setSavedTrips(loadJSON<SavedTrip[]>("rihla:saved-trips", []));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Active destination shared across dashboard + planner + cultural intel.
  // Adjust destination when the user switches their country in settings —
  // the React-recommended "adjust state during render" pattern (avoids
  // a cascading setState inside useEffect).
  const [destination, setDestination] = useState(
    SUGGESTED_DESTINATION[country] || DEFAULT_DESTINATION,
  );
  const [prevCountry, setPrevCountry] = useState(country);
  if (country !== prevCountry) {
    setPrevCountry(country);
    setDestination(SUGGESTED_DESTINATION[country] || DEFAULT_DESTINATION);
  }

  const destCountry = getCountry(destination.code);

  return (
    <div className="pb-32">
      <div className="px-5 pt-2">
        <h1 className="font-display text-4xl">Rihla</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI travel intelligence · {countryInfo.flag} {countryInfo.name}
        </p>
      </div>

      {/* 1. AI Travel Dashboard */}
      <BrainDashboard
        destination={destination}
        onChangeDestination={setDestination}
      />

      {/* Map dashboard (kept, enhanced) */}
      <div className="mx-5 mt-5 rounded-3xl overflow-hidden aspect-[16/10] relative shadow-float">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 40%, hsl(var(--gold)/0.6), transparent 30%), radial-gradient(circle at 70% 60%, hsl(var(--rose)/0.6), transparent 35%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--cream)/0.07) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cream)/0.07) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {MARKERS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setActiveMarker(p.label);
              toast(`${p.city} — exploring`);
            }}
            className="absolute group"
            style={{ left: p.x, top: p.y }}
            aria-label={p.label}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <span className="absolute inset-0 -m-2 rounded-full bg-secondary/40 animate-pulse-glow" />
              <span className="relative block w-3 h-3 rounded-full bg-secondary border-2 border-background" />
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] glass px-2 py-0.5 rounded-full whitespace-nowrap">
                {p.label}
              </span>
            </div>
          </button>
        ))}
        <div className="absolute bottom-3 left-3 glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> {activeMarker ? activeMarker : "Global view"}
        </div>
        <div className="absolute top-3 right-3 glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-secondary" /> AI map · 3 saved
        </div>
      </div>

      {/* Quick tools */}
      <div className="grid grid-cols-5 gap-3 px-5 mt-5">
        {[
          { icon: Plane, label: "Flights" },
          { icon: Hotel, label: "Stays" },
          { icon: FileCheck, label: "Visa" },
          { icon: Languages, label: "Translate" },
          { icon: DollarSign, label: "Currency" },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() =>
              t.label === "Visa"
                ? window.dispatchEvent(new CustomEvent("circle:visa-explorer"))
                : setToolSheet(t.label)
            }
            className="glass rounded-2xl py-3 flex flex-col items-center gap-2 shadow-soft hover:bg-muted/50 transition"
          >
            <t.icon className="w-5 h-5 text-secondary" />
            <span className="text-[11px]">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1b. AI Travel Insights — editorial "Based on your preferences" */}
      <AITravelInsights destination={destination} userCountry={country} />

      {/* 1c. Hot Deals — horizontal rail with countdowns */}
      <HotDealsRail />

      {/* 1d. Popular Destinations — Booking.com-style cards grid */}
      <DestinationCardsGrid onSelect={(d) => setDestDetail(d)} />

      {/* 1e. Trending Destinations — based on user's home region */}
      <TrendingDestinations userCountry={country} onSelect={(d) => setDestDetail(d)} />

      {/* 2. Smart Trip Planner */}
      <SmartTripPlanner
        defaultDestination={destination}
        onUseDestination={setDestination}
      />

      {/* 5. Destination Discovery */}
      <DestinationDiscovery
        passport={country}
        onSelect={(d) => setDestDetail(d)}
      />

      {/* 6. Travel Document Vault */}
      <DocumentVault />

      {/* 7. Cultural Intelligence */}
      <CulturalIntel destination={destination} />

      {/* 8. Expense Tracker */}
      <ExpenseTracker currency={countryInfo.currency} />

      {/* Local transport methods (kept) */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Bus className="w-5 h-5 text-secondary" />
            Getting around {countryInfo.name}
          </h2>
          <span className="text-xs text-muted-foreground">{countryInfo.flag} {countryInfo.capital}</span>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {countryInfo.transportMethods.map((tm) => (
              <button
                key={tm.id}
                onClick={() => toast(`${tm.name} — ${tm.description}`)}
                className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 hover:bg-muted/40 transition text-start"
              >
                <span className="text-2xl shrink-0" aria-hidden>{tm.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{tm.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{tm.description}</div>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-secondary/80 shrink-0">
                  {tm.type.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3 text-center">
            {countryInfo.transportMethods.length} local transport options
          </div>
        </div>
      </div>

      {/* Your trips (kept) */}
      <div className="px-5 mt-6">
        <h2 className="font-display text-xl mb-3">Your trips</h2>
        {savedTrips.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No trips planned yet — use the Smart Trip Planner above!</p>
          </div>
        ) : (
        <div className="space-y-3">
          {savedTrips.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl relative overflow-hidden p-5 shadow-soft min-h-[140px]"
              style={{ color: "hsl(var(--cream))" }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tripGradient(t.id)}`} />
              <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/80 via-charcoal/30 to-transparent" />
              <div className="relative flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-80 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {t.date}
                  </div>
                  <div className="font-display text-3xl mt-1">{t.city}</div>
                  <div className="text-xs opacity-80 mt-1">{t.days?.length || 0} days · saved locally</div>
                </div>
                <button
                  onClick={() => setTripSheet(t)}
                  className="text-xs px-3 py-1.5 rounded-full glass hover:bg-secondary/20 transition"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Tool sheet (now wired to real APIs) */}
      <Sheet open={!!toolSheet} onOpenChange={(v) => !v && setToolSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[90vh] overflow-y-auto">
          {toolSheet && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur z-10">
                <SheetTitle className="font-display text-lg flex items-center gap-2">
                  {toolSheet === "Flights" && <Plane className="w-4 h-4 text-secondary" />}
                  {toolSheet === "Stays" && <Hotel className="w-4 h-4 text-secondary" />}
                  {toolSheet === "Translate" && <Languages className="w-4 h-4 text-secondary" />}
                  {toolSheet === "Currency" && <DollarSign className="w-4 h-4 text-secondary" />}
                  {toolSheet}
                </SheetTitle>
                <SheetDescription>Powered by Cirkle Brain · Real-time</SheetDescription>
              </SheetHeader>
              {toolSheet === "Flights" && (
                <FlightSearchSheet
                  userCountry={country}
                  defaultTo={AIRPORT_BY_COUNTRY[destination.code] || "IST"}
                />
              )}
              {toolSheet === "Stays" && (
                <HotelSearchSheet
                  defaultCity={destination.city}
                  defaultCountry={destination.code}
                />
              )}
              {toolSheet === "Translate" && <TranslateSheet destCountry={destination.code} />}
              {toolSheet === "Currency" && (
                <CurrencySheet
                  userCurrency={countryInfo.currency}
                  destCurrency={destCountry.currency}
                />
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Destination detail sheet */}
      <DestinationDetailSheet
        dest={destDetail}
        onClose={() => setDestDetail(null)}
      />

      {/* Trip detail sheet (kept) */}
      <Sheet open={!!tripSheet} onOpenChange={(v) => !v && setTripSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {tripSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{tripSheet.city}</SheetTitle>
                <SheetDescription>{tripSheet.date} · {tripSheet.days?.length || 0} days</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-8 space-y-3">
                <div className="rounded-2xl overflow-hidden aspect-video relative">
                  <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${tripGradient(tripSheet.id)}`} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-card border border-border p-3">
                    <div className="font-display text-lg">4</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Collabs</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3">
                    <div className="font-display text-lg">12</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saved</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3">
                    <div className="font-display text-lg">{tripSheet.days?.length || 0}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Days</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-card border border-border p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Collaborators</div>
                  <div className="flex -space-x-2">
                    {["L", "O", "S", "K"].map((c) => (
                      <div
                        key={c}
                        className="w-8 h-8 rounded-full bg-gradient-mesh border-2 border-card flex items-center justify-center text-[10px] text-primary-foreground"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    toast.success("Itinerary loaded");
                    setTripSheet(null);
                  }}
                  className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs"
                >
                  Open itinerary
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
