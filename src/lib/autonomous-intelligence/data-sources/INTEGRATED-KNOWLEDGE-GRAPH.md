# 🧠 CIRKLE Brain AI — Integrated Knowledge Graph Specification

**The highest-value data source for the CIRKLE Brain AI.**

This document specifies the integrated knowledge graph that connects all 136
external data sources into a single reasoning layer.

---

## Overview

The Integrated Knowledge Graph (IKG) is the Brain's central intelligence memory.
It connects every entity the Brain knows about — people, places, businesses,
events, weather, roads, transport, organizations, languages, interests,
communities, CIRKLE modules, user interactions, and platform capabilities.

The IKG is NOT a single database dump. It is a **continuously-updated, multi-source
federated graph** that the AIKE (Phase 7.5) engine maintains autonomously.

### Why this is the most important data source

The IKG allows the Brain to answer questions like:
- "What should appear on this user's home dashboard?"
- "Which events are relevant nearby?"
- "Which AI model should handle this request?"
- "Which module should orchestrate this workflow?"
- "How can this feature be improved based on observed usage?"

These questions cannot be answered by a single dataset. They require reasoning
across multiple connected knowledge domains.

---

## Graph Structure

### Node Types (24)

| Domain | Node Types | Primary Sources |
|---|---|---|
| **People** (privacy-preserving) | user | PMB (on-device), user consent |
| **Places** | place, city, country, road | OSM, GeoNames, Natural Earth |
| **Businesses** | business, restaurant, hotel, mall | OSM, OpenCorporates, OpenMenu |
| **Products** | product, flight | OpenFoodFacts, IATA, OpenFlights |
| **Events** | event, public_event | Eventbrite, Meetup, gov portals |
| **Organizations** | company, government_service | OpenCorporates, gov data |
| **Content** | post, video, article, creator | Platform events, news sources |
| **Knowledge** | topic, category, tag | Wikipedia, Wikidata, ConceptNet |
| **Infrastructure** | hospital, school, airport | OSM, OpenAddresses |
| **Platform** | payment, capability, module | CIRKLE internal |

### Edge Types (26)

| Category | Edges |
|---|---|
| **User actions** | visited, liked, purchased, booked, searched, shared, watched, commented, rated, navigated_to, paid_for |
| **Social** | follows, joined, reviewed, created, subscribed_to |
| **Spatial** | located_in, travels_to, navigated_to |
| **Professional** | works_at, verified_by, endorsed_by |
| **Semantic** | belongs_to, similar_to, frequently_used_with, related_to, part_of |

---

## Data Source Integration

Each of the 136 data sources feeds into specific node/edge types:

### World Knowledge → topic, category, tag nodes
- Wikipedia, Wikidata, DBpedia → entity definitions, descriptions
- Common Crawl → web-scale knowledge
- OpenAlex, Internet Archive → research, historical data

### Places & Geographic → place, city, country, road nodes
- OSM Planet, Overpass → all geographic entities
- GeoNames → place names, coordinates, populations
- Natural Earth → physical geography
- OpenAddresses → street-level addresses

### Travel → flight, hotel nodes + travels_to edges
- IATA, OpenFlights → airports, airlines, routes
- GTFS → public transit
- Wikivoyage → travel guides

### Events → event, public_event nodes
- Eventbrite, Meetup, OpenAgenda → public events
- Government portals → official events

### Restaurant → restaurant nodes
- OSM → restaurant locations
- OpenMenu → menus, hours
- OpenFoodFacts → product ingredients, nutrition

### Weather → world-state entries (not graph nodes)
- Open-Meteo, NOAA, ECMWF, NASA → weather metrics

### Traffic → world-state entries (not graph nodes)
- OSRM, Valhalla, OpenRouteService → routing, traffic

### Local Business → business, company nodes
- OpenCorporates → company registrations
- Business registries → official business data

### AI Safety → moderation models (not graph nodes)
- Jigsaw, Detoxify, OpenAI moderation → content safety scoring

### Image/OCR/Face/Voice → specialized models (not graph nodes)
- CLIP, Whisper, SAM → specialized AI experts in the orchestration layer

### Translation → translation models (not graph nodes)
- NLLB, FLORES → 200+ language translation

### Search → search-ranking models (not graph nodes)
- MS MARCO, BEIR → search relevance training

### Recommendation → recommendation models (not graph nodes)
- MovieLens, Amazon Reviews → collaborative filtering

### Knowledge Graph Sources → ALL node types (enrichment)
- Wikidata, ConceptNet, WordNet, YAGO, Schema.org → entity linking, ontologies

### Government Data → government_service, country nodes + statistics
- data.gov, data.europa.eu, data.gov.uk, data.gov.eg → official statistics

### Research Papers → topic nodes (research enrichment)
- arXiv, PubMed, Semantic Scholar → latest research

### Software Knowledge → capability nodes (tech docs)
- GitHub, npm, PyPI → package/code knowledge
- K8s, Flutter, Matrix docs → integration patterns

### AI Models → capability nodes (model registry)
- HuggingFace, ONNX → available AI models as specialized experts

### Documentation Library → capability nodes (protocol specs)
- Matrix, ActivityPub, OIDC, IPFS, libp2p → protocol specifications

---

## Graph Construction

The IKG is built and maintained by the AIKE engine in 4 layers:

### Layer 1: Static Knowledge (loaded once)
- Government data (country statistics, demographics)
- Geographic data (places, roads, boundaries)
- Knowledge graph sources (Wikidata, ConceptNet, Schema.org)
- Documentation library (protocol specs)

### Layer 2: Dynamic Knowledge (refreshed periodically)
- Weather (every 5 minutes)
- Traffic (every 1 minute)
- Currency/exchange rates (every 1 hour)
- News (every 15 minutes)
- Events (every 1 hour)
- Business hours (daily)

### Layer 3: Learned Knowledge (from platform events)
- User preferences (from PMB)
- User journeys (from Experience Replay)
- Domain patterns (from 15 domain trainers)
- Predictions (from Prediction Engine)

### Layer 4: Inferred Knowledge (from cross-module reasoning)
- Cross-module needs (flight → hotels, weather, transport)
- Similar entities (from Semantic Memory Builder)
- Knowledge gaps (from Gap Detector)
- Research results (from Research Scheduler)

---

## Reasoning Capabilities

The IKG enables the Brain to:

1. **Answer "What should appear on this user's home dashboard?"**
   - Query: user → interests → relevant topics → trending content → personalized feed
   - Sources: PMB + LIEE patterns + CIE knowledge + platform events

2. **Answer "Which events are relevant nearby?"**
   - Query: user location → nearby places → events at those places → filter by user interests
   - Sources: GCIE + OSM + Eventbrite/Meetup + PMB preferences

3. **Answer "Which AI model should handle this request?"**
   - Query: request type → required capabilities → available models → provider performance
   - Sources: brain-router + AI models registry + provider-learning + task type

4. **Answer "Which module should orchestrate this workflow?"**
   - Query: user goal → intent → required capabilities → module ownership
   - Sources: CRIE + Capability Registry + CIE + UOB planning

5. **Answer "How can this feature be improved based on observed usage?"**
   - Query: feature → usage patterns → feedback → LIEE proposals → improvements
   - Sources: LIEE + domain trainers + event learning + prediction engine

---

## Privacy Boundaries

The IKG respects strict privacy boundaries:

- **Personal data** stays on the user's device (PMB) — never centralized without consent
- **Aggregated patterns** can be shared (anonymized)
- **Public knowledge** (places, events, weather) is freely shareable
- **Government data** is public record
- **User interactions** are stored locally where appropriate
- **Consent-gated**: no learning outside user consent scope

The IKG never creates centralized personal profiles without explicit user consent.

---

## Implementation

The IKG is implemented in `src/lib/autonomous-intelligence/knowledge-graph.ts`
(Phase 7.5 AIKE). It uses an in-memory graph with Prisma persistence
(`AikeKnowledgeNode` and `AikeKnowledgeEdge` models).

The 136 data sources are registered in
`src/lib/autonomous-intelligence/data-sources/knowledge-source-registry.ts`
and feed into the graph via the `knowledge-acquisition.ts` module.

---

**The Integrated Knowledge Graph is the Brain's reasoning layer. It connects
every piece of knowledge the Brain has, enabling intelligent answers that no
single dataset could provide alone.**
