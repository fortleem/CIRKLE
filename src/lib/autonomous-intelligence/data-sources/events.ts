// @ts-nocheck
import "server-only";

/**
 * Events Intelligence Sources
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Public-event feeds the Brain monitors to keep its `public_events` World
 * State metric fresh and to surface relevant local happenings to users in
 * the Midan (Square) and Rihla (Travel) modules. Consumed by the World State
 * Engine with short TTLs because event data goes stale within hours.
 *
 * Trust heuristic: government portals (90), platform APIs (70-80).
 */
import type { DataSourceConfig } from "./types";

/** Eventbrite public API — searchable global catalog of public events with venue metadata. */
export const eventbriteApi: DataSourceConfig = {
  id: "eventbrite-public-api",
  name: "Eventbrite Public Events API",
  category: "commerce_api",
  description:
    "Searchable API for public events (concerts, conferences, meetups, workshops) with venue, category, date, and ticketing metadata.",
  urls: { api: "https://www.eventbrite.com/platform/api", docs: "https://www.eventbrite.com/platform/api#/reference" },
  trustScore: 80,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["public_events_search", "venue_metadata", "event_categories", "ticketing_status", "geocoded_venues"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 2000,
};

/** Meetup API — community gatherings (interest groups, recurring meetups, RSVP counts). */
export const meetupApi: DataSourceConfig = {
  id: "meetup-api",
  name: "Meetup Community Events API",
  category: "commerce_api",
  description:
    "API over community-organised gatherings — interest-based groups, recurring meetups, and member-attended events with RSVP counts.",
  urls: { api: "https://www.meetup.com/api/", docs: "https://www.meetup.com/api/schema/" },
  trustScore: 75,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["community_events", "interest_groups", "rsvp_counts", "recurring_meetups", "host_profiles"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 30,
};

/** OpenAgenda — cultural events aggregator (concerts, exhibitions, festivals) for EU & MENA. */
export const openAgenda: DataSourceConfig = {
  id: "openagenda",
  name: "OpenAgenda Cultural Events",
  category: "public_api",
  description:
    "Aggregator of cultural events (concerts, exhibitions, festivals) hosted by cities and cultural institutions, with strong Europe and MENA coverage.",
  urls: { api: "https://developers.openagenda.com", docs: "https://developers.openagenda.com/" },
  trustScore: 70,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["cultural_events", "festival_programs", "exhibition_schedules", "city_partner_calendars", "multilingual_descriptions"],
  coverage: ["EU", "MENA", "global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 60,
};

/** Government event portals — per-country official civic event calendars & national days. */
export const governmentEventPortals: DataSourceConfig = {
  id: "government-event-portals",
  name: "Government Public Event Portals",
  category: "government_api",
  description:
    "Per-country official public-event calendars — national days, government-hosted public events, civic ceremonies, and official celebrations.",
  urls: { api: "https://www.gov.uk/government/news", docs: "https://www.gov.uk/guidance/uk-government-events" },
  trustScore: 90,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["national_days", "civic_ceremonies", "government_public_events", "official_holiday_calendar", "ministerial_agendas"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** All events sources, in descending trust order. */
export const eventsSources: DataSourceConfig[] = [
  governmentEventPortals, eventbriteApi, meetupApi, openAgenda,
];

export default eventsSources;
