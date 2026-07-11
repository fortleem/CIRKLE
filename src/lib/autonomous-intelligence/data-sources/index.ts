// @ts-nocheck
/**
 * CIRKLE Brain AI — Data Sources Registry — Public API
 * ============================================================================
 *
 * Phase 7.5 AIKE — External Knowledge Source Registry
 *
 * This barrel re-exports all 22 data source configuration files + the shared
 * DataSourceConfig interface. The registry is consumed by:
 *   - knowledge-acquisition.ts — to discover new knowledge from trusted sources
 *   - trust-ranking.ts — to rank sources by authority
 *   - research-scheduler.ts — to select sources for research tasks
 *   - knowledge-validator.ts — to validate facts against multiple sources
 *
 * Total: 136 data source configs across 20 categories + AI models + docs library.
 *
 * Import convention:
 *   import { ALL_DATA_SOURCES, type DataSourceConfig } from "@/lib/autonomous-intelligence/data-sources";
 * ============================================================================
 */

import "server-only";

// ── Shared Types ──────────────────────────────────────────────────────────
export type {
  DataSourceConfig,
  DataSourceCategory,
  DataSourceFormat,
  DataSourceUpdateFrequency,
  DataSourceIntegrationMethod,
} from "./types";

// ── 1. World Knowledge ────────────────────────────────────────────────────
export { default as worldKnowledgeSources, wikipediaDump, wikidata, dbpedia, commonCrawl, openAlex, internetArchive } from "./world-knowledge";

// ── 2. Places & Geographic Intelligence ───────────────────────────────────
export { default as placesGeographicSources, osmPlanet, overpassApi, geonames, openAddresses, naturalEarth } from "./places-geographic";

// ── 3. Travel Knowledge ───────────────────────────────────────────────────
export { default as travelSources, iataAirportData, gtfsTransitFeeds, wikivoyageDump, openFlights, openTripMap } from "./travel";

// ── 4. Events Intelligence ────────────────────────────────────────────────
export { default as eventsSources, governmentEventPortals, eventbriteApi, meetupApi, openAgenda } from "./events";

// ── 5. Restaurant Intelligence ────────────────────────────────────────────
export { default as restaurantSources, osmRestaurants, openFoodFacts, openMenu } from "./restaurant";

// ── 6. Weather Intelligence ───────────────────────────────────────────────
export { default as weatherSources, noaa, nasaEarthData, ecmwf, openMeteo } from "./weather";

// ── 7. Traffic Intelligence ───────────────────────────────────────────────
export { default as trafficSources, osrm, valhalla, openRouteService, openTraffic } from "./traffic";

// ── 8. Local Business Intelligence ────────────────────────────────────────
export { default as localBusinessSources, openCorporates, businessRegistries, googleBusinessSchemas, yellowPages } from "./local-business";

// ── 9. AI Safety ──────────────────────────────────────────────────────────
export { default as aiSafetySources, openaiModeration, jigsaw, hateXplain, detoxify, laionModeration, civilComments } from "./ai-safety";

// ── 10. Image Understanding ───────────────────────────────────────────────
export { default as imageUnderstandingSources, coco, openImages, lvis, visualGenome, conceptualCaptions, laionImages } from "./image-understanding";

// ── 11. OCR ───────────────────────────────────────────────────────────────
export { default as ocrSources, docLayNet, rvlCdip, iamHandwriting, synthText } from "./ocr";

// ── 12. Face Recognition ──────────────────────────────────────────────────
export { default as faceRecognitionSources, vggFace2, insightFace, ms1m, casiaWebFace } from "./face-recognition";

// ── 13. Voice Intelligence ────────────────────────────────────────────────
export { default as voiceSources, fleurs, libriSpeech, voxCeleb, mozillaCommonVoice } from "./voice";

// ── 14. Translation ───────────────────────────────────────────────────────
export { default as translationSources, nllb, madlad, flores, opus, ccMatrix } from "./translation";

// ── 15. Search Intelligence ───────────────────────────────────────────────
export { default as searchSources, beir, mteb, msMarco, naturalQuestions, hotpotQA } from "./search";

// ── 16. Recommendation Intelligence ───────────────────────────────────────
export { default as recommendationSources, movieLens, amazonReviews, goodBooks, lastfm, retailRocket } from "./recommendation";

// ── 17. Knowledge Graph Sources ───────────────────────────────────────────
export { default as knowledgeGraphSources, wikidataKG, schemaOrg, wordNet, conceptNet, yago, freebase } from "./knowledge-graph-sources";

// ── 18. Government Data ───────────────────────────────────────────────────
export { default as governmentDataSources, usaGov, euGov, ukGov, egyptGov, saudiGov, uaeGov, uaeBayanat, globalOpenDataPortals } from "./government-data";

// ── 19. Research Papers ───────────────────────────────────────────────────
export { default as researchPaperSources, pubmed, crossRef, arxiv, semanticScholar, openAlexResearch, papersWithCode } from "./research-papers";

// ── 20. Software Knowledge ────────────────────────────────────────────────
export { default as softwareKnowledgeSources, githubApi, gitlabApi, huggingFaceHub, pypi, npmRegistry, rustCrates, dockerHub, kubernetesDocs, flutterDocs, matrixDocs, activityPubDocs, awesomeLists } from "./software-knowledge";

// ── 21. AI Models (specialized experts) ───────────────────────────────────
export { default as aiModelsSources, clipModel, whisperModel, samModel, qwenModel, llamaModel, gemmaModel, phiModel, mistralModel, sentenceTransformers, onnxModels, huggingFaceModels } from "./ai-models";

// ── 22. Documentation Library ─────────────────────────────────────────────
export { default as docsLibrarySources, matrixDocsLib, activityPubDocsLib, oidcDocs, osmDocs, flutterDocsLib, dartDocs, postgresqlDocs, sqliteDocs, ipfsDocs, libp2pDocs, peertubeDocs, mailcowDocs, ntfyDocs, onnxRuntimeDocs, kubernetesDocsLib, dockerDocs, openApiDocs, graphqlDocs } from "./docs-library";

// ── Master Registry: ALL data sources ─────────────────────────────────────

import worldKnowledge from "./world-knowledge";
import placesGeographic from "./places-geographic";
import travel from "./travel";
import events from "./events";
import restaurant from "./restaurant";
import weather from "./weather";
import traffic from "./traffic";
import localBusiness from "./local-business";
import aiSafety from "./ai-safety";
import imageUnderstanding from "./image-understanding";
import ocr from "./ocr";
import faceRecognition from "./face-recognition";
import voice from "./voice";
import translation from "./translation";
import search from "./search";
import recommendation from "./recommendation";
import knowledgeGraph from "./knowledge-graph-sources";
import governmentData from "./government-data";
import researchPapers from "./research-papers";
import softwareKnowledge from "./software-knowledge";
import aiModels from "./ai-models";
import docsLibrary from "./docs-library";

import type { DataSourceConfig } from "./types";

/** All 136 data source configs across 22 categories. */
export const ALL_DATA_SOURCES: DataSourceConfig[] = [
  ...worldKnowledge,
  ...placesGeographic,
  ...travel,
  ...events,
  ...restaurant,
  ...weather,
  ...traffic,
  ...localBusiness,
  ...aiSafety,
  ...imageUnderstanding,
  ...ocr,
  ...faceRecognition,
  ...voice,
  ...translation,
  ...search,
  ...recommendation,
  ...knowledgeGraph,
  ...governmentData,
  ...researchPapers,
  ...softwareKnowledge,
  ...aiModels,
  ...docsLibrary,
];

/** Get all sources for a specific category. */
export function getSourcesByCategory(category: string): DataSourceConfig[] {
  return ALL_DATA_SOURCES.filter((s) => s.category === category);
}

/** Get all sources that provide a specific capability. */
export function getSourcesByCapability(capability: string): DataSourceConfig[] {
  return ALL_DATA_SOURCES.filter((s) => s.capabilities.includes(capability));
}

/** Get all free sources (no API key required). */
export function getFreeSources(): DataSourceConfig[] {
  return ALL_DATA_SOURCES.filter((s) => s.free && !s.requiresApiKey);
}

/** Get sources sorted by trust score (highest first). */
export function getSourcesByTrust(limit?: number): DataSourceConfig[] {
  const sorted = [...ALL_DATA_SOURCES].sort((a, b) => b.trustScore - a.trustScore);
  return limit ? sorted.slice(0, limit) : sorted;
}

/** Get sources that cover a specific country/region. */
export function getSourcesByCoverage(country: string): DataSourceConfig[] {
  return ALL_DATA_SOURCES.filter(
    (s) => s.coverage.includes("global") || s.coverage.includes(country.toUpperCase()) || s.coverage.includes(country.toLowerCase()),
  );
}

/** Registry stats. */
export function getRegistryStats(): {
  totalSources: number;
  freeSources: number;
  apiSources: number;
  dumpSources: number;
  avgTrustScore: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  for (const s of ALL_DATA_SOURCES) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  }
  return {
    totalSources: ALL_DATA_SOURCES.length,
    freeSources: ALL_DATA_SOURCES.filter((s) => s.free).length,
    apiSources: ALL_DATA_SOURCES.filter((s) => s.integrationMethod === "api_call").length,
    dumpSources: ALL_DATA_SOURCES.filter((s) => s.integrationMethod === "dump_download").length,
    avgTrustScore: Math.round(
      ALL_DATA_SOURCES.reduce((sum, s) => sum + s.trustScore, 0) / ALL_DATA_SOURCES.length,
    ),
    byCategory,
  };
}
