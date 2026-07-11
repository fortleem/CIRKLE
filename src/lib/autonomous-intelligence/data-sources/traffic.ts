// @ts-nocheck
import "server-only";

/**
 * Traffic Intelligence Sources
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Real-time traffic, routing, and turn-by-turn directions APIs backing the
 * Brain's `traffic` and `road_closures` World State metrics. Used by the Maps
 * domain trainer and the prediction engine for `next_transport` predictions.
 *
 * All sources here are open-source routing engines, not commercial traffic
 * providers (Google/TomTom) — those would be registered separately as
 * `partner_api` if procured.
 *
 * Trust heuristic: open routing engines (75-85); realtime congestion quality
 * varies by region.
 */
import type { DataSourceConfig } from "./types";

/** OpenTraffic — open historical & realtime traffic speeds aligned to OSM segments. */
export const openTraffic: DataSourceConfig = {
  id: "opentraffic",
  name: "OpenTraffic Historical & Realtime Speeds",
  category: "transport_api",
  description:
    "Open traffic data store aggregated from GPS traces and aligned to OSM segments — historical congestion patterns and realtime speeds where coverage exists.",
  urls: { api: "https://opentraffic.io", docs: "https://github.com/opentraffic" },
  trustScore: 75,
  format: "protobuf",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["realtime_speeds", "historical_congestion", "osm_segment_alignment", "travel_time_estimation", "recurrent_congestion_patterns"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** OSRM — high-performance routing over OSM (fastest/shortest paths, ETAs, isochrones). */
export const osrm: DataSourceConfig = {
  id: "osrm",
  name: "OSRM Open Source Routing Machine",
  category: "maps_api",
  description:
    "High-performance routing engine over OSM road networks — fastest/shortest paths, multi-leg routes, and ETA estimation, with self-hostable instances.",
  urls: { api: "https://router.project-osrm.org", docs: "http://project-osrm.org/docs/v5.5.1/api/" },
  trustScore: 80,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["fastest_route", "shortest_route", "multi_leg_routing", "eta_estimation", "isochrone_computation", "turn_by_turn_directions"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** Valhalla — multimodal routing (car/bike/foot/transit) with matrices & isochrones. */
export const valhalla: DataSourceConfig = {
  id: "valhalla",
  name: "Valhalla Multimodal Routing Engine",
  category: "maps_api",
  description:
    "Open multimodal routing engine (car, bike, foot, transit) with time-distance matrices, isochrones, and elevation-aware routing.",
  urls: { api: "https://valhalla.openstreetmap.de", docs: "https://valhalla.github.io/valhalla/api/" },
  trustScore: 80,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["multimodal_routing", "time_distance_matrices", "isochrone_polygons", "elevation_aware_routing", "optimized_route_sequencing", "heighted_route_profiles"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** OpenRouteService — hosted routing API over OSM with free tier (directions, isochrones, matrices). */
export const openRouteService: DataSourceConfig = {
  id: "openrouteservice",
  name: "OpenRouteService Directions API",
  category: "maps_api",
  description:
    "Hosted routing API over OSM with a free tier — directions, isochrones, matrices, elevation, and POI search, run by Heidelberg GIScience.",
  urls: { api: "https://api.openrouteservice.org", docs: "https://openrouteservice.org/dev/#/api-docs" },
  trustScore: 80,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["directions_multi_profile", "isochrone_service", "matrix_service", "elevation_service", "pois_search", "route_optimization"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 40,
};

/** All traffic sources, in descending trust order. */
export const trafficSources: DataSourceConfig[] = [
  osrm, valhalla, openRouteService, openTraffic,
];

export default trafficSources;
