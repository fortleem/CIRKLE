/**
 * CIRKLE Brain AI — Capability Intelligence Engine (CIE)
 * ============================================================================
 *
 * Phase 8 — Capability Intelligence Engine
 *
 * CIE is the AI's internal cognitive model of the entire CIRKLE ecosystem.
 * It is NOT an intelligence phase that reasons/recommends/executes. It is
 * the authoritative knowledge layer that supplies structured platform
 * intelligence to UOB, TEE, LIEE, and other services.
 *
 * Architecture separation (per final recommendation):
 *   - Capability Registry (Phase 4.5): runtime registration service
 *   - CIE (Phase 8): authoritative cognitive knowledge layer
 *
 * CIE answers: "What is the complete CIRKLE ecosystem?"
 *   - Platform capabilities (what can the platform do?)
 *   - Country intelligence (what's available in each country?)
 *   - Government intelligence (what government services exist?)
 *   - Partner intelligence (who are the partners + what do they offer?)
 *   - Enterprise intelligence (what enterprise integrations exist?)
 *   - Capability ontology (how are capabilities organized?)
 *   - Knowledge graph (how does everything connect?)
 *   - Versioning (how do capabilities evolve?)
 * ============================================================================
 */

import type { CIEStatus } from "./types";
import { CIE_SCHEMA_VERSION } from "./types";
import { globalCountryIntelligence } from "./country-intelligence";
import { globalGovernmentIntelligence } from "./government-intelligence";
import { globalPartnerIntelligence } from "./partner-intelligence";
import { globalEnterpriseIntelligence } from "./enterprise-intelligence";
import { globalCapabilityOntology } from "./capability-ontology";
import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalDiscoveryService } from "./discovery-service";
import { globalVersioningFramework } from "./versioning";
import {
  seedCountries,
  seedGovernmentServices,
  seedPartners,
  seedEnterpriseIntegrations,
  seedOntologyNodes,
  seedVersionInfo,
} from "./seed-data";

let seeded = false;

/**
 * Seed CIE with real data. Idempotent.
 */
export function seedCIE(): void {
  if (seeded) return;

  // Seed countries.
  for (const c of seedCountries) globalCountryIntelligence.register(c);

  // Seed government services.
  for (const s of seedGovernmentServices) globalGovernmentIntelligence.register(s);

  // Seed partners.
  for (const p of seedPartners) globalPartnerIntelligence.register(p);

  // Seed enterprise integrations.
  for (const e of seedEnterpriseIntegrations) globalEnterpriseIntelligence.register(e);

  // Seed ontology.
  for (const n of seedOntologyNodes) globalCapabilityOntology.addNode(n);

  // Seed version info.
  for (const v of seedVersionInfo) globalVersioningFramework.register(v);

  // Seed knowledge graph nodes + edges.
  // Countries → graph nodes.
  for (const c of seedCountries) {
    globalKnowledgeGraph.addNode({
      nodeId: `country.${c.countryCode}`,
      type: "country",
      label: c.name,
      entityId: c.countryCode,
      metadata: { languages: c.languages, currencies: c.currencies, status: c.status },
    });
  }
  // Government services → graph nodes.
  for (const s of seedGovernmentServices) {
    globalKnowledgeGraph.addNode({
      nodeId: `gov.${s.serviceId}`,
      type: "government-service",
      label: s.name,
      entityId: s.serviceId,
      metadata: { type: s.type, countryCode: s.countryCode, status: s.status },
    });
    // Edge: government-service → country (available-in).
    globalKnowledgeGraph.addEdge({
      fromNodeId: `gov.${s.serviceId}`,
      toNodeId: `country.${s.countryCode}`,
      type: "available-in",
    });
  }
  // Partners → graph nodes.
  for (const p of seedPartners) {
    globalKnowledgeGraph.addNode({
      nodeId: `partner.${p.partnerId}`,
      type: "partner",
      label: p.name,
      entityId: p.partnerId,
      metadata: { category: p.category, status: p.status, regions: p.regions },
    });
  }
  // Enterprise integrations → graph nodes.
  for (const e of seedEnterpriseIntegrations) {
    globalKnowledgeGraph.addNode({
      nodeId: `enterprise.${e.integrationId}`,
      type: "enterprise-integration",
      label: e.name,
      entityId: e.integrationId,
      metadata: { type: e.type, vendor: e.vendor, status: e.status },
    });
  }

  seeded = true;
}

/**
 * Ensure CIE is seeded. Safe to call from anywhere.
 */
export function ensureCIESeeded(): void {
  if (!seeded) seedCIE();
}

// ── CIE Engine ───────────────────────────────────────────────────────────

export class CIEEngine {
  /**
   * Get CIE status + observability.
   */
  status(): CIEStatus {
    ensureCIESeeded();
    const graphStats = globalKnowledgeGraph.getStats();
    const ontologyStats = globalCapabilityOntology.getStats();
    return {
      phase: "8",
      name: "Capability Intelligence Engine",
      status: "operational",
      countries: globalCountryIntelligence.getStats().total,
      governmentServices: globalGovernmentIntelligence.getStats().total,
      partners: globalPartnerIntelligence.getStats().total,
      enterpriseIntegrations: globalEnterpriseIntelligence.getStats().total,
      graphNodes: graphStats.nodes,
      graphEdges: graphStats.edges,
      ontologyNodes: ontologyStats.nodes,
      capabilitiesTracked: globalVersioningFramework.getStats().total,
    };
  }

  /**
   * Get the country intelligence model.
   */
  get countryIntelligence() {
    ensureCIESeeded();
    return globalCountryIntelligence;
  }

  /**
   * Get the government intelligence model.
   */
  get governmentIntelligence() {
    ensureCIESeeded();
    return globalGovernmentIntelligence;
  }

  /**
   * Get the partner intelligence model.
   */
  get partnerIntelligence() {
    ensureCIESeeded();
    return globalPartnerIntelligence;
  }

  /**
   * Get the enterprise intelligence model.
   */
  get enterpriseIntelligence() {
    ensureCIESeeded();
    return globalEnterpriseIntelligence;
  }

  /**
   * Get the capability ontology.
   */
  get ontology() {
    ensureCIESeeded();
    return globalCapabilityOntology;
  }

  /**
   * Get the knowledge graph.
   */
  get knowledgeGraph() {
    ensureCIESeeded();
    return globalKnowledgeGraph;
  }

  /**
   * Get the discovery service.
   */
  get discovery() {
    ensureCIESeeded();
    return globalDiscoveryService;
  }

  /**
   * Get the versioning framework.
   */
  get versioning() {
    ensureCIESeeded();
    return globalVersioningFramework;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCIEEngine = new CIEEngine();
