/**
 * CIRKLE Brain AI — CIE Discovery Service
 * ============================================================================
 * Dynamic, metadata-driven discovery interfaces for:
 *   - UOB (planning)
 *   - TEE (execution resolution)
 *   - LIEE (learning analysis)
 *   - Capability Registry (registration)
 *   - Administrative tooling
 * ============================================================================
 */

import type { DiscoveryQuery, DiscoveryResult } from "./types";
import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalCountryIntelligence } from "./country-intelligence";
import { globalGovernmentIntelligence } from "./government-intelligence";
import { globalPartnerIntelligence } from "./partner-intelligence";
import { globalEnterpriseIntelligence } from "./enterprise-intelligence";
import { ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-seed";
import { globalCapabilityRegistry } from "@/lib/cognitive/capability-registry";

export class DiscoveryService {
  /**
   * Discover capabilities, partners, government services, enterprise
   * integrations, and graph nodes matching a query.
   */
  async discover(query: DiscoveryQuery): Promise<DiscoveryResult> {
    ensureCapabilitiesSeeded();
    const limit = query.limit ?? 50;
    const results: DiscoveryResult = {
      capabilities: [],
      partners: [],
      governmentServices: [],
      enterpriseIntegrations: [],
      graphNodes: [],
      total: 0,
    };

    // ── Search capabilities ─────────────────────────────────────────────
    const caps = globalCapabilityRegistry.search({
      text: query.text,
      category: query.category as never,
      availableOnly: query.status === "active",
      limit,
    });
    results.capabilities = caps.map((c) => ({
      capabilityId: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      status: c.status,
    }));

    // ── Search partners ─────────────────────────────────────────────────
    const partners = globalPartnerIntelligence.list();
    const filteredPartners = partners.filter((p) => {
      if (query.status && p.status !== query.status) return false;
      if (query.country && !p.operatingCountries.includes(query.country)) return false;
      if (query.partner && p.partnerId !== query.partner) return false;
      if (query.text) {
        const q = query.text.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.category.includes(q);
      }
      return true;
    });
    results.partners = filteredPartners.slice(0, limit).map((p) => ({
      partnerId: p.partnerId,
      name: p.name,
      category: p.category,
    }));

    // ── Search government services ──────────────────────────────────────
    const govServices = globalGovernmentIntelligence.list();
    const filteredGov = govServices.filter((s) => {
      if (query.status && s.status !== query.status) return false;
      if (query.country && s.countryCode !== query.country) return false;
      if (query.text) {
        const q = query.text.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.type.includes(q);
      }
      return true;
    });
    results.governmentServices = filteredGov.slice(0, limit).map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      type: s.type,
      countryCode: s.countryCode,
    }));

    // ── Search enterprise integrations ──────────────────────────────────
    const entIntegrations = globalEnterpriseIntelligence.list();
    const filteredEnt = entIntegrations.filter((i) => {
      if (query.status && i.status !== query.status) return false;
      if (query.country && !i.availableCountries.includes(query.country)) return false;
      if (query.text) {
        const q = query.text.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.type.includes(q);
      }
      return true;
    });
    results.enterpriseIntegrations = filteredEnt.slice(0, limit).map((i) => ({
      integrationId: i.integrationId,
      name: i.name,
      type: i.type,
    }));

    // ── Search graph nodes ──────────────────────────────────────────────
    const graphStats = globalKnowledgeGraph.getStats();
    void graphStats; // graph nodes are traversed on demand via the graph API
    if (query.type) {
      const nodes = globalKnowledgeGraph.getNodesByType(query.type);
      results.graphNodes = nodes.slice(0, limit).map((n) => ({
        nodeId: n.nodeId,
        type: n.type,
        label: n.label,
        entityId: n.entityId,
      }));
    }

    results.total =
      results.capabilities.length +
      results.partners.length +
      results.governmentServices.length +
      results.enterpriseIntegrations.length +
      results.graphNodes.length;

    return results;
  }

  /**
   * Discover what's available in a specific country.
   */
  discoverForCountry(countryCode: string): {
    country: string;
    capabilities: string[];
    partners: string[];
    governmentServices: string[];
    availablePacks: string[];
  } {
    const country = globalCountryIntelligence.get(countryCode);
    return {
      country: countryCode,
      capabilities: globalKnowledgeGraph.getCapabilitiesInCountry(countryCode),
      partners: globalPartnerIntelligence.listByCountry(countryCode).map((p) => p.partnerId),
      governmentServices: globalGovernmentIntelligence.listByCountry(countryCode).map((s) => s.serviceId),
      availablePacks: country?.availableCapabilityPacks || [],
    };
  }
}

export const globalDiscoveryService = new DiscoveryService();
