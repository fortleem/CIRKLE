// @ts-nocheck
import "server-only";

/**
 * Recommendation Intelligence Datasets
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * User-item interaction logs that teach the Brain's Recommender how to
 * do collaborative filtering, content-based filtering, hybrid ranking,
 * and cold-start handling.
 *
 * IMPORTANT — these datasets teach RECOMMENDATION ALGORITHMS, NOT content.
 * The Brain ingests the interaction graphs (user-id × item-id × rating ×
 * timestamp) to learn ranking patterns; the underlying movie/book/song
 * titles serve only as opaque item labels and are never surfaced to the
 * user as content. Circle's product recommendations come from the operator's
 * own catalogue, scored by these algorithms.
 *
 * Backs the AIKE Recommender and the personalisation layer for Circle's
 * Midan feed, Educational Workspace suggestions, and Creator Channel
 * discovery.
 * Trust heuristic: institutionally curated academic benchmarks (80-90),
 * community-released / commercial-recycled datasets (70-80).
 */
import type { DataSourceConfig } from "./types";

/** MovieLens — GroupLens 25M/1M/100k ratings; the canonical CF benchmark. */
export const movieLens: DataSourceConfig = {
  id: "movielens",
  name: "MovieLens Ratings Datasets",
  category: "public_api",
  description:
    "MovieLens (25M, 1M, 100k variants) — GroupLens Research's long-running movie-rating dataset: user-item-rating-timestamp tuples with tag and genome scores; the canonical benchmark for collaborative filtering and matrix factorisation.",
  urls: { download: "https://grouplens.org/datasets/movielens/", docs: "https://grouplens.org/datasets/movielens/" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["collaborative-filtering", "matrix-factorisation", "cold-start", "implicit-feedback", "tag-genome"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Amazon Reviews — 233M product reviews across 29 categories (McAuley lab). */
export const amazonReviews: DataSourceConfig = {
  id: "amazon-reviews",
  name: "Amazon Product Reviews Dataset (2018)",
  category: "commerce_api",
  description:
    "Amazon Reviews 2018 — 233.1M reviews, 50.2M items, 15.5M users across 29 categories, plus product metadata (title, price, brand, image), and a graph of also-viewed / also-bought links; the canonical e-commerce recommendation dataset.",
  urls: { download: "https://nijianmo.github.io/amazon/index.html", docs: "https://nijianmo.github.io/amazon/index.html" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["collaborative-filtering", "content-based-filtering", "hybrid-recommendations", "review-based-ranking", "session-recommendation", "cold-start"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** GoodBooks-10k — 6M ratings of 10k books from 53k users; CF + book metadata. */
export const goodBooks: DataSourceConfig = {
  id: "goodbooks-10k",
  name: "GoodBooks-10k Dataset",
  category: "public_api",
  description:
    "GoodBooks-10k — 6 million ratings of 10,000 books by 53,424 users, with book metadata (title, authors, genres, language, average rating, similar books); the standard medium-scale book recommendation benchmark.",
  urls: { download: "https://github.com/zygmuntz/goodbooks-10k", docs: "https://www.kaggle.com/datasets/zygmunt/goodbooks-10k" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["collaborative-filtering", "content-based-filtering", "hybrid-recommendations", "metadata-rich-ranking", "cold-start"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** LastFM-1k / 2k — listening events with timestamps for sequential rec. */
export const lastfm: DataSourceConfig = {
  id: "lastfm-1k",
  name: "LastFM Listening History Datasets",
  category: "public_api",
  description:
    "LastFM-1k / LastFM-2k — full listening histories of ~1k–2k users with timestamps, tags, and social-friend edges; the standard music sequential-recommendation and session-based-rec benchmark.",
  urls: { download: "http://ocelma.net/MusicRecommendationDataset/lastfm-1K.html", docs: "https://grouplens.org/datasets/hetrec-2011/" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["collaborative-filtering", "sequential-recommendation", "session-based-rec", "cold-start", "social-aware-rec"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** RetailRocket — anonymised e-commerce click/buy event log from 2015. */
export const retailRocket: DataSourceConfig = {
  id: "retail-rocket",
  name: "RetailRocket E-Commerce Event Log",
  category: "commerce_api",
  description:
    "RetailRocket — 4.5M anonymised user events (view, add-to-cart, transaction) over 417k items from a real e-commerce site in 2015; widely-used log for session-based and real-time recommendation research.",
  urls: { download: "https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset", docs: "https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset" },
  trustScore: 70,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["session-based-rec", "real-time-recommendation", "cold-start", "implicit-feedback", "conversion-prediction"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All recommendation-intelligence sources, in descending trust order. */
export const recommendationSources: DataSourceConfig[] = [
  movieLens, amazonReviews, goodBooks, lastfm, retailRocket,
];

export default recommendationSources;
