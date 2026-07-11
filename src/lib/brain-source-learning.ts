"use server";

/**
 * Cirkle Brain AI — Source Learning Engine
 *
 * Tracks which news sources users click/read most, and uses this data
 * to prioritize sources in future searches. The Brain "learns" over time
 * which sources are most trusted and relevant for each country.
 *
 * This is part of the continuous learning layer (Layer 1: Memory).
 */

import { db } from "@/lib/db";

export interface SourcePopularity {
  source: string;
  host: string;
  country: string;
  clicks: number;
  category: string;
  lastClicked: string;
}

/**
 * Record a user click on a news source.
 * Called when a user opens a news article.
 */
export async function recordSourceClick(source: string, sourceUrl: string, country: string, category: string): Promise<void> {
  try {
    let host = "unknown";
    try { host = new URL(sourceUrl).hostname.replace(/^www\./, ""); } catch { /* ignore */ }

    // In production: store in Prisma. For now: use in-memory + localStorage on client.
    // The client-side use-brain-learning hook handles localStorage tracking.
    console.log(`[brain-source-learning] ${source} (${host}) clicked for ${country}/${category}`);
  } catch { /* ignore */ }
}

/**
 * Get the most popular sources for a country (from learning data).
 * Returns sources sorted by popularity (most clicked first).
 * Falls back to the default country sources if no learning data exists.
 */
export async function getLearnedSources(country: string): Promise<string[]> {
  try {
    // In production: query Prisma for most-clicked sources per country
    // For now: return empty (falls back to country-news-sources.ts defaults)
    return [];
  } catch {
    return [];
  }
}

/**
 * Get the global source popularity ranking.
 * Used by the Brain to understand which sources are most trusted worldwide.
 */
export async function getGlobalSourceRanking(): Promise<{ source: string; clicks: number }[]> {
  try {
    // In production: aggregate from Prisma
    return [];
  } catch {
    return [];
  }
}
