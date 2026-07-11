// @ts-nocheck
import "server-only";

/**
 * Places & Geographic Intelligence Sources
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Geographic spine for the Brain: roads, buildings, addresses, place names,
 * administrative boundaries, and physical features. Powers the Maps domain
 * trainer, the travel/place lookup path, and the geo-validation step in the
 * Knowledge Validator.
 *
 * Trust heuristic: community-curated geodata (75-85); official gazetteers
 * (90+) are per-country and registered separately.
 */
import type { DataSourceConfig } from "./types";

/** OpenStreetMap Planet — full global geodata dump (roads, buildings, POIs, admin boundaries). */
export const openStreetMapPlanet: DataSourceConfig = {
  id: "osm-planet",
  name: "OpenStreetMap Planet",
  category: "openstreetmap",
  description:
    "Full planet dump of OpenStreetMap — every node, way, and relation (roads, buildings, POIs, administrative boundaries) in OSM PBF format.",
  urls: { download: "https://planet.openstreetmap.org", docs: "https://wiki.openstreetmap.org/wiki/Planet.osm" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "weekly",
  integrationMethod: "dump_download",
  capabilities: ["road_network", "building_footprints", "points_of_interest", "administrative_boundaries", "address_interpolation", "cycle_walking_routes"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** GeoNames — gazetteer of ~12M place names with coordinates, admin hierarchy, multilingual alternates. */
export const geoNames: DataSourceConfig = {
  id: "geonames",
  name: "GeoNames Gazetteer",
  category: "public_api",
  description:
    "Gazetteer of ~12 million place names with coordinates, administrative hierarchy, population, and multilingual alternate names.",
  urls: { download: "https://www.geonames.org", api: "https://www.geonames.org/export/web-services.html", docs: "https://www.geonames.org/export/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "daily",
  integrationMethod: "dump_download",
  capabilities: ["place_disambiguation", "geocoding_fallback", "admin_hierarchy", "multilingual_names", "population_estimates", "postal_codes"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 1000,
};

/** Natural Earth — public-domain vector & raster global map data at 1:10m / 1:50m / 1:110m scales. */
export const naturalEarth: DataSourceConfig = {
  id: "natural-earth",
  name: "Natural Earth Vector & Raster",
  category: "public_api",
  description:
    "Public-domain global map data at 1:10m, 1:50m, and 1:110m scales — coastlines, borders, rivers, cities, and raster shaded relief.",
  urls: { download: "https://www.naturalearthdata.com", docs: "https://www.naturalearthdata.com/downloads/" },
  trustScore: 75,
  format: "geojson",
  updateFrequency: "quarterly",
  integrationMethod: "dump_download",
  capabilities: ["country_boundaries", "physical_features", "low_zoom_basemap", "thematic_layers", "raster_shaded_relief"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** OpenAddresses — global aggregated open address points (gov + OSM provenance). */
export const openAddresses: DataSourceConfig = {
  id: "openaddresses",
  name: "OpenAddresses Address Dataset",
  category: "public_api",
  description:
    "Aggregated, machine-readable address points sourced from governments and OSM — global coverage with per-country provenance.",
  urls: { download: "https://openaddresses.io", docs: "https://docs.openaddresses.io" },
  trustScore: 75,
  format: "csv",
  updateFrequency: "monthly",
  integrationMethod: "dump_download",
  capabilities: ["address_geocoding", "address_validation", "last_mile_routing", "parcel_linkage"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Overpass API — live Overpass QL queries over a current OSM mirror (targeted POI / road lookups). */
export const overpassApi: DataSourceConfig = {
  id: "overpass-api",
  name: "Overpass API (OSM Live Query)",
  category: "openstreetmap",
  description:
    "Read-only API that evaluates Overpass QL queries against a current mirror of OpenStreetMap — targeted POI and road lookups on demand.",
  urls: { api: "https://overpass-api.de/api/interpreter", docs: "https://wiki.openstreetmap.org/wiki/Overpass_API" },
  trustScore: 85,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["poi_lookup", "road_segment_query", "area_search", "tag_filtered_search", "live_osm_mirror"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** All places & geographic sources, in descending trust order. */
export const placesGeographicSources: DataSourceConfig[] = [
  openStreetMapPlanet, overpassApi, geoNames, openAddresses, naturalEarth,
];

export default placesGeographicSources;
