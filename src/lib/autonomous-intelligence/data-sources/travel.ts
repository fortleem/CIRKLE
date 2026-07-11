// @ts-nocheck
import "server-only";

/**
 * Travel Knowledge Sources (for Rihla)
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Sources that feed the Rihla (Circle Travel) module and its AIKE Travel
 * domain trainer: airports, flight routes, transit schedules, attractions,
 * and curated travel guides. Power next-trip predictions, itinerary
 * validation, and travel-recommendation freshness checks.
 *
 * Trust heuristic: aviation authorities (90-95), community travel wikis
 * (75-85), transit agencies (85).
 */
import type { DataSourceConfig } from "./types";

/** OpenTripMap — community-curated, multilingual catalog of tourist attractions. */
export const openTripMap: DataSourceConfig = {
  id: "opentripmap",
  name: "OpenTripMap Attractions Catalog",
  category: "tourism_board",
  description:
    "Community-curated, multilingual catalog of tourist attractions (museums, landmarks, parks, viewpoints) with descriptions and categories.",
  urls: { api: "https://opentripmap.io", docs: "https://opentripmap.io/docs" },
  trustScore: 70,
  format: "json",
  updateFrequency: "weekly",
  integrationMethod: "api_call",
  capabilities: ["tourist_attractions", "multilingual_descriptions", "poi_categories", "photo_links", "rough_coordinates"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 60,
};

/** OpenFlights — community airport, airline & flight-route datasets (CSV dump). */
export const openFlights: DataSourceConfig = {
  id: "openflights",
  name: "OpenFlights Airports & Routes",
  category: "public_api",
  description:
    "Community-maintained downloadable datasets of airports, airlines, and flight routes — used as a topology seed for the travel graph.",
  urls: { download: "https://openflights.org/data.html", docs: "https://openflights.org/data.php" },
  trustScore: 75,
  format: "csv",
  updateFrequency: "monthly",
  integrationMethod: "dump_download",
  capabilities: ["airport_codes", "airline_codes", "route_topology", "hub_identification", "geocoordinates"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** IATA — authoritative industry reference for airport codes, airline designators, aircraft types. */
export const iataAirportData: DataSourceConfig = {
  id: "iata-airport-data",
  name: "IATA Airport & Airline Reference",
  category: "transport_api",
  description:
    "Authoritative industry reference for airport codes (IATA/ICAO), airline designators, aircraft types, and standardized schedule metadata.",
  urls: { api: "https://www.iata.org/en/services/statistics-and-data/", docs: "https://www.iata.org/en/publications/store/" },
  trustScore: 95,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["airport_codes_iata_icao", "airline_designators", "aircraft_types", "schedule_metadata", "route_authorization"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
  rateLimitPerMin: 60,
};

/** GTFS — per-agency transit feeds (schedules, stops, routes, calendar exceptions). */
export const gtfsTransitFeeds: DataSourceConfig = {
  id: "gtfs-transit-feeds",
  name: "GTFS Public Transit Feeds",
  category: "transport_api",
  description:
    "Open-standard per-agency feeds of transit schedules, stops, routes, and calendar exceptions (buses, metros, trams, ferries).",
  urls: { download: "https://developers.google.com/transit/gtfs", api: "https://transitfeeds.com", docs: "https://gtfs.org/documentation/schedule/" },
  trustScore: 85,
  format: "csv",
  updateFrequency: "daily",
  integrationMethod: "dump_download",
  capabilities: ["transit_stops", "transit_routes", "schedule_timetables", "calendar_exceptions", "trip_shapes", "fare_rules"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Wikivoyage dump — free, community-written travel guides for thousands of destinations. */
export const wikivoyageDump: DataSourceConfig = {
  id: "wikivoyage-dump",
  name: "Wikivoyage Travel Guides",
  category: "wikipedia",
  description:
    "Free, community-written travel guides for thousands of destinations — narrative descriptions, customs, safety notes, and regional overviews.",
  urls: { download: "https://dumps.wikimedia.org/backup-index-bydb.html", docs: "https://en.wikivoyage.org/wiki/Wikivoyage:Database_dump" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "monthly",
  integrationMethod: "dump_download",
  capabilities: ["destination_guides", "customs_and_etiquette", "safety_advisories", "regional_overviews", "phrasebook_snippets"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All travel sources, in descending trust order. */
export const travelSources: DataSourceConfig[] = [
  iataAirportData, gtfsTransitFeeds, wikivoyageDump, openFlights, openTripMap,
];

export default travelSources;
