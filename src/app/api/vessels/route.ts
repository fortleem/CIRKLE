import { NextResponse } from "next/server";

/**
 * GET /api/vessels
 * Returns mock real-time AIS (Automatic Identification System) data for vessels
 * near the user's selected port region. Data is generated with realistic noise
 * on each request so the Vessel Tracker overlay feels live.
 */

interface Vessel {
  id: string;
  name: string;
  mmsi: string;
  imo: string;
  type: "cargo" | "tanker" | "passenger" | "ferry" | "tug" | "yacht" | "fishing";
  flag: string;
  flagEmoji: string;
  lat: number;
  lng: number;
  sog: number; // speed over ground (knots)
  cog: number; // course over ground (degrees)
  heading: number;
  status: "under_way" | "at_anchor" | "moored" | "restricted";
  destination: string;
  eta: string;
  length: number; // meters
  draught: number; // meters
  lastUpdate: string;
}

const PORTS = [
  { name: "Jebel Ali", country: "AE", lat: 25.013, lng: 55.062 },
  { name: "Jeddah", country: "SA", lat: 21.483, lng: 39.190 },
  { name: "King Abdullah", country: "SA", lat: 27.415, lng: 35.425 },
  { name: "Singapore", country: "SG", lat: 1.264, lng: 103.836 },
  { name: "Rotterdam", country: "NL", lat: 51.952, lng: 4.137 },
  { name: "Shanghai", country: "CN", lat: 31.230, lng: 121.474 },
  { name: "Suez", country: "EG", lat: 29.934, lng: 32.549 },
  { name: "Piraeus", country: "GR", lat: 37.942, lng: 23.647 },
];

const VESSEL_TYPES: Vessel["type"][] = ["cargo", "tanker", "passenger", "ferry", "tug", "yacht", "fishing"];
const FLAGS: { code: string; emoji: string; name: string }[] = [
  { code: "PA", emoji: "🇵🇦", name: "Panama" },
  { code: "LR", emoji: "🇱🇷", name: "Liberia" },
  { code: "MH", emoji: "🇲🇭", name: "Marshall Islands" },
  { code: "MT", emoji: "🇲🇹", name: "Malta" },
  { code: "SG", emoji: "🇸🇬", name: "Singapore" },
  { code: "HK", emoji: "🇭🇰", name: "Hong Kong" },
  { code: "BS", emoji: "🇧🇸", name: "Bahamas" },
  { code: "CY", emoji: "🇨🇾", name: "Cyprus" },
  { code: "AE", emoji: "🇦🇪", name: "UAE" },
  { code: "SA", emoji: "🇸🇦", name: "Saudi Arabia" },
];

const VESSEL_NAMES = [
  "NEPTUNE STAR", "ARABIAN DAWN", "DUNES EXPRESS", "GULF PIONEER",
  "RED SEA VOYAGER", "SAKURA MARU", "PACIFIC ECHO", "MEDITERRANEAN PEARL",
  "ALULA TRADER", "INDIAN OCEAN", "OASIS BRIDGE", "NILE COURIER",
];

const DESTINATIONS = [
  "JEBEL ALI", "JEDDAH", "SINGAPORE", "ROTTERDAM", "SHANGHAI",
  "SUEZ", "PIRAEUS", "DAMMAM", "HAMBURG", "BUSAN", "HONG KONG", "KOBE",
];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVessel(idx: number): Vessel {
  const port = pick(PORTS);
  const type = pick(VESSEL_TYPES);
  const flag = pick(FLAGS);
  const sog = type === "fishing" || type === "tug" ? rand(0, 8) : rand(0, 22);
  const cog = rand(0, 360);
  const isMoving = sog > 1;
  const status: Vessel["status"] = sog < 0.5 ? "moored" : sog < 1 ? "at_anchor" : isMoving ? "under_way" : "restricted";

  const mmsi = `${flag.code === "PA" ? "3" : flag.code === "LR" ? "5" : flag.code === "MH" ? "5" : flag.code === "MT" ? "2" : "4"}${randInt(10000000, 99999999)}`;
  const imo = `IMO ${randInt(7000000, 9999999)}`;
  const etaDays = randInt(0, 14);
  const etaDate = new Date(Date.now() + etaDays * 86400000);
  const eta = etaDays === 0 ? "Today" : etaDate.toISOString().slice(0, 10);

  return {
    id: `vsl-${idx + 1}`,
    name: VESSEL_NAMES[idx % VESSEL_NAMES.length] + ` ${String.fromCharCode(65 + (idx % 26))}`,
    mmsi,
    imo,
    type,
    flag: flag.name,
    flagEmoji: flag.emoji,
    lat: port.lat + rand(-0.4, 0.4),
    lng: port.lng + rand(-0.4, 0.4),
    sog: parseFloat(sog.toFixed(1)),
    cog: parseFloat(cog.toFixed(1)),
    heading: parseFloat((cog + rand(-5, 5)).toFixed(1)),
    status,
    destination: pick(DESTINATIONS),
    eta,
    length: type === "tanker" ? randInt(200, 330) : type === "cargo" ? randInt(150, 300) : type === "passenger" ? randInt(80, 220) : randInt(20, 90),
    draught: parseFloat(rand(4, 16).toFixed(1)),
    lastUpdate: new Date().toISOString(),
  };
}

export async function GET() {
  const vessels: Vessel[] = Array.from({ length: 8 }).map((_, i) => generateVessel(i));
  return NextResponse.json({
    count: vessels.length,
    generatedAt: new Date().toISOString(),
    region: "user-port-region",
    vessels,
  });
}
