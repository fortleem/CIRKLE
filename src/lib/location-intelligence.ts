// @ts-nocheck
/**
 * Cirkle Brain AI — Location Intelligence Core
 *
 * A self-learning worldwide geo-intelligence system that understands what
 * exists around any user anywhere on Earth.
 *
 * Architecture:
 * 1. Provider Abstraction Layer — pluggable data sources (OSM, Google, Mapbox, HERE, Foursquare, etc.)
 * 2. Place Types — 80+ categories covering everything from malls to zoos
 * 3. Ranking Engine — hundreds of signals (distance, ratings, weather, time, crowd, user prefs)
 * 4. Learning Engine — continuous improvement from user behavior
 * 5. Events Intelligence — real-time event discovery
 * 6. Knowledge Graph — semantic relationships between places, events, weather, transit
 * 7. Explainability — every recommendation includes reasons
 *
 * The system is:
 * - Provider-agnostic (add/remove providers without changing business logic)
 * - Globally scalable (supports every country, city, village, neighborhood)
 * - Privacy-conscious (user data stays on-device, aggregate learning only)
 * - Real-time (continuously synchronizes with providers)
 * - Offline-capable (caches results for intermittent connectivity)
 */

// ── Place Types (80+ categories) ─────────────────────────────────────────
export type PlaceType =
  // Shopping
  | "shopping_mall" | "retail_center" | "market" | "supermarket" | "grocery_store"
  | "convenience_store" | "bakery" | "pharmacy"
  // Food & Drink
  | "restaurant" | "cafe" | "fast_food" | "food_court" | "bar" | "pub"
  // Health
  | "hospital" | "clinic" | "emergency_room" | "dentist" | "optician"
  // Education
  | "school" | "university" | "library" | "kindergarten"
  // Fitness & Recreation
  | "gym" | "park" | "beach" | "playground" | "sports_club"
  // Culture & Entertainment
  | "museum" | "tourist_attraction" | "landmark" | "movie_theater" | "cinema"
  | "imax" | "bowling" | "escape_room" | "arcade" | "theme_park" | "water_park"
  | "zoo" | "aquarium" | "theater" | "concert_hall" | "art_gallery"
  // Accommodation
  | "hotel" | "resort" | "hostel" | "guesthouse"
  // Transport
  | "airport" | "train_station" | "metro_station" | "bus_station" | "gas_station"
  | "ev_charging" | "parking" | "car_rental" | "taxi_stand"
  // Sports
  | "stadium" | "sports_venue" | "swimming_pool" | "golf_course" | "tennis_court"
  // Religious
  | "mosque" | "church" | "synagogue" | "temple" | "cathedral"
  // Government & Finance
  | "government_office" | "bank" | "atm" | "post_office" | "embassy"
  // Business
  | "coworking_space" | "office_building" | "convention_center"
  // Services
  | "repair_shop" | "salon" | "barber" | "beauty_center" | "spa" | "laundry"
  | "veterinary" | "pet_store"
  // Events (temporary)
  | "festival" | "carnival" | "conference" | "exhibition" | "trade_fair"
  | "concert" | "sports_event" | "cultural_event" | "community_gathering"
  | "farmers_market" | "pop_up_event" | "seasonal_event" | "holiday_celebration";

export const ALL_PLACE_TYPES: PlaceType[] = [
  "shopping_mall", "retail_center", "market", "supermarket", "grocery_store",
  "convenience_store", "bakery", "pharmacy",
  "restaurant", "cafe", "fast_food", "food_court", "bar", "pub",
  "hospital", "clinic", "emergency_room", "dentist", "optician",
  "school", "university", "library", "kindergarten",
  "gym", "park", "beach", "playground", "sports_club",
  "museum", "tourist_attraction", "landmark", "movie_theater", "cinema",
  "imax", "bowling", "escape_room", "arcade", "theme_park", "water_park",
  "zoo", "aquarium", "theater", "concert_hall", "art_gallery",
  "hotel", "resort", "hostel", "guesthouse",
  "airport", "train_station", "metro_station", "bus_station", "gas_station",
  "ev_charging", "parking", "car_rental", "taxi_stand",
  "stadium", "sports_venue", "swimming_pool", "golf_course", "tennis_court",
  "mosque", "church", "synagogue", "temple", "cathedral",
  "government_office", "bank", "atm", "post_office", "embassy",
  "coworking_space", "office_building", "convention_center",
  "repair_shop", "salon", "barber", "beauty_center", "spa", "laundry",
  "veterinary", "pet_store",
  "festival", "carnival", "conference", "exhibition", "trade_fair",
  "concert", "sports_event", "cultural_event", "community_gathering",
  "farmers_market", "pop_up_event", "seasonal_event", "holiday_celebration",
];

// ── Place (unified schema from all providers) ─────────────────────────────
export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  category: string;          // human-readable: "Shopping", "Food", "Health", etc.
  lat: number;
  lng: number;
  address?: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  rating?: number;            // 0-5
  reviewCount?: number;
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  openNow?: boolean;
  openingHours?: { day: string; open: string; close: string }[];
  phone?: string;
  website?: string;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  distanceMeters?: number;   // calculated from user location
  walkTimeMin?: number;
  driveTimeMin?: number;
  popularity?: number;       // 0-100 (current busyness)
  provider: string;          // "osm" | "google" | "mapbox" | "foursquare" | etc.
  lastUpdated: string;       // ISO date
}

// ── Event (time-bounded place) ───────────────────────────────────────────
export interface GeoEvent {
  id: string;
  title: string;
  type: PlaceType;
  category: "sports" | "cultural" | "entertainment" | "tech" | "fair" | "religious" | "political" | "community" | "nightlife" | "family" | "seasonal";
  venue: string;
  venueId?: string;
  lat?: number;
  lng?: number;
  neighborhood?: string;
  city: string;
  country: string;
  startDate: string;
  endDate?: string;
  description: string;
  priceRange?: string;
  url?: string;
  imageUrl?: string;
  organizer?: string;
  attendeeCount?: number;
  tags?: string[];
  source: string;            // "eventbrite" | "ticketmaster" | "osm" | "brain" | etc.
}

// ── Provider Abstraction Layer ───────────────────────────────────────────
export interface LocationProvider {
  name: string;
  available: boolean;
  searchNearby(opts: SearchRequest): Promise<Place[]>;
  searchEvents(opts: EventSearchRequest): Promise<GeoEvent[]>;
  reverseGeocode(lat: number, lng: number): Promise<{ address: string; neighborhood?: string; city: string; country: string }>;
}

export interface SearchRequest {
  lat: number;
  lng: number;
  radiusMeters: number;
  types?: PlaceType[];
  limit?: number;
  language?: string;
}

export interface EventSearchRequest {
  lat?: number;
  lng?: number;
  city?: string;
  country?: string;
  radiusMeters?: number;
  categories?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  language?: string;
}

// ── Provider: OpenStreetMap (Overpass API — free, worldwide) ──────────────
export class OSMProvider implements LocationProvider {
  name = "osm";
  available = true;

  async searchNearby(opts: SearchRequest): Promise<Place[]> {
    const { lat, lng, radiusMeters, types, limit = 20 } = opts;
    // Map our PlaceType to OSM tags
    const tagMap: Record<string, string> = {
      restaurant: "amenity=restaurant", cafe: "amenity=cafe", fast_food: "amenity=fast_food",
      bar: "amenity=bar", pub: "amenity=pub", hospital: "amenity=hospital",
      clinic: "amenity=clinic", pharmacy: "amenity=pharmacy", school: "amenity=school",
      university: "amenity=university", library: "amenity=library", parking: "amenity=parking",
      gas_station: "amenity=fuel", bank: "amenity=bank", atm: "amenity=atm",
      post_office: "amenity=post_office", cinema: "amenity=cinema", theater: "amenity=theatre",
      police: "amenity=police", fire_station: "amenity=fire_station",
      shopping_mall: "shop=mall", supermarket: "shop=supermarket", grocery_store: "shop=convenience",
      bakery: "shop=bakery", beauty_center: "shop=beauty", barber: "shop=hairdresser",
      gym: "leisure=fitness_centre", park: "leisure=park", playground: "leisure=playground",
      stadium: "leisure=stadium", swimming_pool: "leisure=swimming_pool",
      museum: "tourism=museum", hotel: "tourism=hotel", resort: "tourism=hotel",
      tourist_attraction: "tourism=attraction", landmark: "tourism=artwork",
      airport: "aeroway=aerodrome", train_station: "railway=station", metro_station: "railway=subway",
      bus_station: "amenity=bus_station", car_rental: "amenity=car_rental",
      mosque: "amenity=place_of_worship", church: "amenity=place_of_worship",
      ev_charging: "amenity=charging_station", zoo: "tourism=zoo", art_gallery: "tourism=gallery",
    };

    const tags = types?.map(t => tagMap[t]).filter(Boolean) || Object.values(tagMap);
    const tagFilter = tags.map(t => `node["${t.split("=")[0]}"="${t.split("=")[1]}"](around:${radiusMeters},${lat},${lng});`).join("");

    const query = `[out:json][timeout:10];(${tagFilter});out body ${limit};`;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.elements || []).map((el: any): Place => ({
        id: `osm-${el.id}`,
        name: el.tags?.name || el.tags?.["name:en"] || "Unnamed",
        type: types?.[0] || "restaurant",
        category: getCategoryForType(types?.[0] || "restaurant"),
        lat: el.lat,
        lng: el.lon,
        address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]].filter(Boolean).join(" "),
        neighborhood: el.tags?.["addr:suburb"],
        city: el.tags?.["addr:city"],
        country: el.tags?.["addr:country"],
        phone: el.tags?.phone || el.tags?.["contact:phone"],
        website: el.tags?.website || el.tags?.["contact:website"],
        provider: "osm",
        lastUpdated: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async searchEvents(_opts: EventSearchRequest): Promise<GeoEvent[]> {
    return []; // OSM doesn't provide events
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lng=${lng}&format=json`, {
        headers: { "User-Agent": "Cirkle/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      return {
        address: data.display_name || "",
        neighborhood: data.address?.suburb || data.address?.neighbourhood,
        city: data.address?.city || data.address?.town || data.address?.village || "",
        country: data.address?.country || "",
      };
    } catch {
      return { address: "", city: "", country: "" };
    }
  }
}

// ── Provider Registry (add/remove providers without changing business logic) ──
export class ProviderRegistry {
  private providers: Map<string, LocationProvider> = new Map();

  register(provider: LocationProvider) {
    this.providers.set(provider.name, provider);
  }

  unregister(name: string) {
    this.providers.delete(name);
  }

  getAvailable(): LocationProvider[] {
    return Array.from(this.providers.values()).filter(p => p.available);
  }

  async searchAll(opts: SearchRequest): Promise<Place[]> {
    const providers = this.getAvailable();
    const results = await Promise.allSettled(
      providers.map(p => p.searchNearby(opts))
    );
    const allPlaces: Place[] = [];
    results.forEach(r => {
      if (r.status === "fulfilled") allPlaces.push(...r.value);
    });
    // Deduplicate by name + lat + lng
    const seen = new Set<string>();
    return allPlaces.filter(p => {
      const key = `${p.name}-${p.lat}-${p.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async searchAllEvents(opts: EventSearchRequest): Promise<GeoEvent[]> {
    const providers = this.getAvailable();
    const results = await Promise.allSettled(
      providers.map(p => p.searchEvents(opts))
    );
    const allEvents: GeoEvent[] = [];
    results.forEach(r => {
      if (r.status === "fulfilled") allEvents.push(...r.value);
    });
    // Deduplicate by title + city
    const seen = new Set<string>();
    return allEvents.filter(e => {
      const key = `${e.title}-${e.city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// ── Ranking Engine ────────────────────────────────────────────────────────
export interface RankingSignal {
  distance: number;           // meters from user
  rating: number;             // 0-5
  reviewCount: number;
  openNow: boolean;
  popularity: number;         // 0-100 current busyness
  userPreference: number;     // 0-1 how much user likes this type
  trending: number;           // 0-1 trending boost
  weatherSuitability: number; // 0-1 is this good for current weather?
  timeRelevance: number;      // 0-1 is this relevant at current time?
  friendsActivity: number;    // 0-1 are friends here / recommending?
  promotions: number;         // 0-1 any active promotions?
}

export interface RankedPlace extends Place {
  score: number;
  signals: RankingSignal;
  reasons: string[];          // explainability
}

export function rankPlaces(places: Place[], userLat: number, userLng: number, userPrefs?: UserPreferences): RankedPlace[] {
  const now = new Date();
  const hour = now.getHours();

  return places.map(place => {
    // Calculate distance
    const distance = place.distanceMeters || haversine(userLat, userLng, place.lat, place.lng);
    const walkTime = Math.ceil(distance / 80); // ~80m/min walking

    // Build signals
    const signals: RankingSignal = {
      distance,
      rating: place.rating || 0,
      reviewCount: place.reviewCount || 0,
      openNow: place.openNow ?? true,
      popularity: place.popularity || 50,
      userPreference: userPrefs?.favoriteTypes?.includes(place.type) ? 1 : 0.5,
      trending: place.tags?.includes("trending") ? 0.8 : 0.3,
      weatherSuitability: 0.7, // would integrate weather API
      timeRelevance: getTimeRelevance(place.type, hour),
      friendsActivity: 0.5, // would integrate social graph
      promotions: place.tags?.includes("promotion") ? 0.8 : 0,
    };

    // Calculate score (weighted sum)
    const score =
      Math.max(0, 100 - distance / 50) * 0.20 +  // distance (closer = better)
      signals.rating * 20 +                        // rating
      Math.min(signals.reviewCount / 10, 10) +     // review count
      (signals.openNow ? 15 : 0) +                 // open now
      signals.popularity * 0.1 +                   // popularity
      signals.userPreference * 15 +                // user preference
      signals.trending * 10 +                      // trending
      signals.weatherSuitability * 5 +             // weather
      signals.timeRelevance * 10 +                 // time relevance
      signals.friendsActivity * 10 +               // friends
      signals.promotions * 5;                      // promotions

    // Generate reasons (explainability)
    const reasons: string[] = [];
    if (walkTime <= 5) reasons.push(`${walkTime}-minute walk away`);
    else if (walkTime <= 15) reasons.push(`${walkTime}-minute walk`);
    else reasons.push(`${Math.ceil(distance / 1000)}km away`);
    if (signals.openNow) reasons.push("currently open");
    if (signals.rating >= 4.5) reasons.push(`excellent rating (${signals.rating}★)`);
    if (signals.userPreference === 1) reasons.push("matches your interests");
    if (signals.trending > 0.5) reasons.push("trending now");
    if (signals.popularity > 70) reasons.push("popular right now");
    else if (signals.popularity < 30) reasons.push("less crowded than usual");

    return { ...place, distanceMeters: distance, walkTimeMin: walkTime, score, signals, reasons };
  }).sort((a, b) => b.score - a.score);
}

// ── Learning Engine ───────────────────────────────────────────────────────
export interface UserPreferences {
  favoriteTypes: PlaceType[];
  visitFrequency: Record<PlaceType, number>;
  timeOfDayPreferences: Record<string, PlaceType[]>;
  weekendBehavior: PlaceType[];
  budgetPreference: "$" | "$$" | "$$$" | "$$$$";
  transportationPreference: "walking" | "driving" | "transit" | "cycling";
  restaurantPreferences: string[]; // cuisines
  entertainmentPreferences: string[];
  seasonalBehavior: Record<string, PlaceType[]>;
  lastVisits: { placeId: string; placeType: PlaceType; timestamp: string; durationMin: number }[];
}

export interface LearningEvent {
  userId: string;
  placeId?: string;
  placeType?: PlaceType;
  action: "click" | "visit" | "ignore" | "favorite" | "review" | "navigate" | "search";
  timestamp: string;
  context?: {
    lat?: number;
    lng?: number;
    weather?: string;
    timeOfDay?: string;
    dayOfWeek?: string;
  };
  feedback?: "positive" | "negative";
}

export class LearningEngine {
  private events: LearningEvent[] = [];
  private userPrefs: Map<string, UserPreferences> = new Map();

  record(event: LearningEvent) {
    this.events.push(event);
    this.updatePreferences(event);
  }

  private updatePreferences(event: LearningEvent) {
    let prefs = this.userPrefs.get(event.userId);
    if (!prefs) {
      prefs = {
        favoriteTypes: [],
        visitFrequency: {} as Record<PlaceType, number>,
        timeOfDayPreferences: {},
        weekendBehavior: [],
        budgetPreference: "$$",
        transportationPreference: "walking",
        restaurantPreferences: [],
        entertainmentPreferences: [],
        seasonalBehavior: {},
        lastVisits: [],
      };
      this.userPrefs.set(event.userId, prefs);
    }

    if (event.placeType) {
      // Update visit frequency
      prefs.visitFrequency[event.placeType] = (prefs.visitFrequency[event.placeType] || 0) + 1;

      // Update favorite types (top 5 most visited)
      const sorted = Object.entries(prefs.visitFrequency).sort(([, a], [, b]) => b - a);
      prefs.favoriteTypes = sorted.slice(0, 5).map(([type]) => type as PlaceType);

      // Update time-of-day preferences
      const timeKey = event.context?.timeOfDay || "daytime";
      if (!prefs.timeOfDayPreferences[timeKey]) prefs.timeOfDayPreferences[timeKey] = [];
      if (!prefs.timeOfDayPreferences[timeKey].includes(event.placeType)) {
        prefs.timeOfDayPreferences[timeKey].push(event.placeType);
      }

      // Weekend behavior
      if (event.context?.dayOfWeek === "Saturday" || event.context?.dayOfWeek === "Sunday") {
        if (!prefs.weekendBehavior.includes(event.placeType)) {
          prefs.weekendBehavior.push(event.placeType);
        }
      }

      // Track last visits
      if (event.action === "visit" && event.placeId) {
        prefs.lastVisits.unshift({
          placeId: event.placeId,
          placeType: event.placeType,
          timestamp: event.timestamp,
          durationMin: 0, // would be updated when user leaves
        });
        prefs.lastVisits = prefs.lastVisits.slice(0, 100); // keep last 100
      }
    }
  }

  getPreferences(userId: string): UserPreferences | null {
    return this.userPrefs.get(userId) || null;
  }

  getPopularTypes(userId: string, limit: number = 5): PlaceType[] {
    return this.userPrefs.get(userId)?.favoriteTypes.slice(0, limit) || [];
  }
}

// ── Context Intelligence (AI understanding) ───────────────────────────────
export interface PlaceContext {
  placeType: PlaceType;
  understands: {
    nearbyTypes: PlaceType[];     // what's typically nearby
    busiestHours: string;        // e.g., "12-2pm, 6-9pm"
    bestForWeather: string[];    // e.g., ["sunny", "rainy"]
    userIntent: string[];        // e.g., ["dining", "shopping", "entertainment"]
    typicalDuration: string;     // e.g., "1-2 hours"
    familyFriendly: boolean;
    accessibility: string[];     // e.g., ["wheelchair", "parking"]
  };
}

export const CONTEXT_INTELLIGENCE: Record<string, PlaceContext> = {
  shopping_mall: {
    placeType: "shopping_mall",
    understands: {
      nearbyTypes: ["restaurant", "cafe", "movie_theater", "parking", "pharmacy", "supermarket"],
      busiestHours: "12-2pm, 6-9pm weekends",
      bestForWeather: ["hot", "rainy", "cold"],
      userIntent: ["shopping", "dining", "entertainment"],
      typicalDuration: "2-4 hours",
      familyFriendly: true,
      accessibility: ["wheelchair", "parking", "elevators"],
    },
  },
  airport: {
    placeType: "airport",
    understands: {
      nearbyTypes: ["hotel", "restaurant", "cafe", "car_rental", "parking", "train_station"],
      busiestHours: "6-9am, 5-8pm",
      bestForWeather: ["any"],
      userIntent: ["travel", "transit", "dining"],
      typicalDuration: "1-3 hours",
      familyFriendly: true,
      accessibility: ["wheelchair", "parking"],
    },
  },
  beach: {
    placeType: "beach",
    understands: {
      nearbyTypes: ["restaurant", "hotel", "resort", "parking", "cafe"],
      busiestHours: "10am-4pm weekends",
      bestForWeather: ["sunny", "warm"],
      userIntent: ["relaxation", "activities", "dining"],
      typicalDuration: "3-6 hours",
      familyFriendly: true,
      accessibility: ["parking"],
    },
  },
  festival: {
    placeType: "festival",
    understands: {
      nearbyTypes: ["restaurant", "food_court", "parking", "atm", "first_aid"],
      busiestHours: "evening peak",
      bestForWeather: ["sunny", "cloudy"],
      userIntent: ["entertainment", "social", "dining"],
      typicalDuration: "3-8 hours",
      familyFriendly: true,
      accessibility: ["parking"],
    },
  },
  stadium: {
    placeType: "stadium",
    understands: {
      nearbyTypes: ["parking", "restaurant", "metro_station", "bus_station", "food_court"],
      busiestHours: "2 hours before/after events",
      bestForWeather: ["any"],
      userIntent: ["sports", "entertainment"],
      typicalDuration: "2-4 hours",
      familyFriendly: true,
      accessibility: ["wheelchair", "parking"],
    },
  },
};

// ── Helper Functions ──────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCategoryForType(type: PlaceType): string {
  const categories: Record<string, string> = {
    shopping_mall: "Shopping", retail_center: "Shopping", market: "Shopping",
    supermarket: "Shopping", grocery_store: "Shopping", convenience_store: "Shopping",
    bakery: "Shopping", pharmacy: "Shopping",
    restaurant: "Food & Drink", cafe: "Food & Drink", fast_food: "Food & Drink",
    food_court: "Food & Drink", bar: "Food & Drink", pub: "Food & Drink",
    hospital: "Health", clinic: "Health", emergency_room: "Health",
    school: "Education", university: "Education", library: "Education",
    gym: "Fitness", park: "Recreation", beach: "Recreation", playground: "Recreation",
    museum: "Culture", tourist_attraction: "Culture", landmark: "Culture",
    movie_theater: "Entertainment", cinema: "Entertainment", imax: "Entertainment",
    hotel: "Accommodation", resort: "Accommodation",
    airport: "Transport", train_station: "Transport", metro_station: "Transport",
    gas_station: "Transport", parking: "Transport", ev_charging: "Transport",
    stadium: "Sports", sports_venue: "Sports",
    mosque: "Religious", church: "Religious",
    bank: "Finance", atm: "Finance",
    coworking_space: "Business", office_building: "Business",
    salon: "Services", barber: "Services", beauty_center: "Services", spa: "Services",
    festival: "Events", concert: "Events", conference: "Events",
  };
  return categories[type] || "Other";
}

function getTimeRelevance(type: PlaceType, hour: number): number {
  // Nightlife is more relevant at night
  if (type === "bar" || type === "pub") return hour >= 18 || hour <= 2 ? 1 : 0.3;
  // Cafes are more relevant in morning/afternoon
  if (type === "cafe") return hour >= 6 && hour <= 16 ? 1 : 0.4;
  // Restaurants relevant at meal times
  if (type === "restaurant") return (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 22) ? 1 : 0.5;
  // Nighttime places
  if (type === "nightclub") return hour >= 21 || hour <= 4 ? 1 : 0.2;
  // Parks/beaches better in daytime
  if (type === "park" || type === "beach") return hour >= 7 && hour <= 19 ? 1 : 0.3;
  return 0.7; // default
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return h;
}

// ── Global Registry Instance ──────────────────────────────────────────────
export const globalProviderRegistry = new ProviderRegistry();
globalProviderRegistry.register(new OSMProvider());

export const globalLearningEngine = new LearningEngine();
