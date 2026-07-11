// @ts-nocheck
import "server-only";

/**
 * Restaurant Intelligence Sources (structured data, NOT reviews)
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Structured restaurant data: locations, opening hours, menus, cuisines,
 * contact details, and food/product attributes. The Brain NEVER ingests
 * subjective restaurant reviews from these sources — review-style sentiment
 * is owned by the user-feedback path (LIEE) and is explicitly out of scope.
 *
 * Feeds the restaurant node type in the knowledge graph and freshness checks
 * for the `business_openings` World State metric.
 *
 * Trust heuristic: OSM community (80), OpenFoodFacts community (75),
 * OpenMenu commercial (70).
 */
import type { DataSourceConfig } from "./types";

/** OpenStreetMap restaurants — tagged POIs (name, cuisine, hours, contact). No reviews. */
export const openStreetMapRestaurants: DataSourceConfig = {
  id: "osm-restaurants",
  name: "OpenStreetMap Restaurant POIs",
  category: "openstreetmap",
  description:
    "Tagged subset of OSM POIs (restaurants, cafes, fast food, bakeries, supermarkets) — structured facts only: name, cuisine, opening hours, address, contact. No reviews.",
  urls: { api: "https://overpass-api.de/api/interpreter", docs: "https://wiki.openstreetmap.org/wiki/Map_Features#Amenity" },
  trustScore: 80,
  format: "json",
  updateFrequency: "weekly",
  integrationMethod: "api_call",
  capabilities: ["restaurant_locations", "cuisine_tags", "opening_hours", "vegan_vegetarian_tags", "wheelchair_accessibility", "takeaway_delivery_tags"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** OpenMenu — standardised restaurant menu API (items, prices, dietary tags, allergens). */
export const openMenu: DataSourceConfig = {
  id: "openmenu",
  name: "OpenMenu Standardised Menu API",
  category: "commerce_api",
  description:
    "API over normalised restaurant menu data — dishes, prices, descriptions, dietary tags, and allergen info, exposed via the OpenMenu standard.",
  urls: { api: "https://openmenu.com/api", docs: "https://openmenu.com/api/v2/documentation" },
  trustScore: 70,
  format: "json",
  updateFrequency: "weekly",
  integrationMethod: "api_call",
  capabilities: ["menu_items", "menu_pricing", "dietary_tags", "allergen_flags", "menu_currency", "menu_translations"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
  rateLimitPerMin: 60,
};

/** OpenFoodFacts — community-built open food product database (barcodes, nutrition, allergens). */
export const openFoodFacts: DataSourceConfig = {
  id: "openfoodfacts",
  name: "OpenFoodFacts Product Database",
  category: "public_api",
  description:
    "Community-built database of packaged food products — barcodes, ingredients, nutrition grades, allergens, and labels (organic, halal, kosher).",
  urls: { api: "https://world.openfoodfacts.org", docs: "https://wiki.openfoodfacts.org/API" },
  trustScore: 75,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["product_barcodes", "ingredient_lists", "nutrition_grades", "allergen_flags", "dietary_labels", "brand_metadata"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 100,
};

/** All restaurant sources, in descending trust order. */
export const restaurantSources: DataSourceConfig[] = [
  openStreetMapRestaurants, openFoodFacts, openMenu,
];

export default restaurantSources;
