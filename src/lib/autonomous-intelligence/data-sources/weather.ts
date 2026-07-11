// @ts-nocheck
import "server-only";

/**
 * Weather Intelligence Sources
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Meteorological feeds backing the Brain's `weather` World State metric.
 * Consumed by the World State Engine with very short TTLs (current
 * conditions expire within an hour; forecasts within hours). Sources span
 * free no-key APIs, government weather services, and institutional
 * reanalysis datasets.
 *
 * Trust heuristic: government / IGO meteorology (85-95), free no-key APIs
 * (85), community (75).
 */
import type { DataSourceConfig } from "./types";

/** Open-Meteo — free, keyless hourly/daily forecasts + reanalysis for any lat/lng. */
export const openMeteo: DataSourceConfig = {
  id: "open-meteo",
  name: "Open-Meteo Free Weather API",
  category: "weather_api",
  description:
    "Free, keyless daily and hourly weather forecasts plus historical reanalysis for any latitude/longitude, with global model coverage.",
  urls: { api: "https://open-meteo.com", docs: "https://open-meteo.com/en/docs" },
  trustScore: 85,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["hourly_forecast", "daily_forecast", "historical_reanalysis", "severe_weather_alerts", "marine_forecast", "air_quality_index"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 600,
};

/** NOAA — US-government weather, climate, and ocean data (NWS, GHCN, IBTrACS). */
export const noaa: DataSourceConfig = {
  id: "noaa",
  name: "NOAA Weather & Climate API",
  category: "government_api",
  description:
    "Authoritative US-government weather, climate, and ocean data — NWS point forecasts, GHCN historical observations, and IBTrACS storm tracks.",
  urls: { api: "https://www.weather.gov/documentation/services-web-api", docs: "https://www.ncdc.noaa.gov/cdo-web/webservices/v2" },
  trustScore: 90,
  format: "json",
  updateFrequency: "hourly",
  integrationMethod: "api_call",
  capabilities: ["us_point_forecasts", "climate_observations", "storm_tracks", "marine_conditions", "severe_watches_warnings", "historical_normals"],
  coverage: ["US", "global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 60,
};

/** ECMWF — global numerical weather prediction & ERA5 reanalysis. */
export const ecmwf: DataSourceConfig = {
  id: "ecmwf",
  name: "ECMWF Forecasts & ERA5 Reanalysis",
  category: "weather_api",
  description:
    "Top-tier global numerical weather prediction and ERA5 reanalysis from the European Centre for Medium-Range Weather Forecasts.",
  urls: { api: "https://api.ecmwf.int/v1", docs: "https://confluence.ecmwf.int/display/WEBAPI" },
  trustScore: 90,
  format: "protobuf",
  updateFrequency: "hourly",
  integrationMethod: "api_call",
  capabilities: ["medium_range_outlooks", "era5_reanalysis", "ensemble_forecasts", "seasonal_outlooks", "extreme_event_attribution"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
  rateLimitPerMin: 20,
};

/** NASA Earth Data — satellite-derived weather, precipitation, and surface variables. */
export const nasaEarthData: DataSourceConfig = {
  id: "nasa-earth-data",
  name: "NASA Earth Observation Data",
  category: "government_api",
  description:
    "Open NASA data archive (Giovanni, MODIS, GPM, POWER) for satellite-derived weather, precipitation, and surface variables.",
  urls: { api: "https://earthdata.nasa.gov", docs: "https://wiki.earthdata.nasa.gov/" },
  trustScore: 90,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["satellite_precipitation", "surface_temperature", "vegetation_indices", "solar_radiation_power", "tropical_rainfall_mission", "historical_climatology"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 30,
};

/** All weather sources, in descending trust order. */
export const weatherSources: DataSourceConfig[] = [
  noaa, nasaEarthData, ecmwf, openMeteo,
];

export default weatherSources;
