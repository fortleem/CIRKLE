// @ts-nocheck
import "server-only";

/**
 * Documentation Library Sources — Phase 7.5 AIKE
 * ============================================================================
 * Official documentation sites indexed by the Brain as canonical reference
 * material for every protocol, framework, runtime, and specification that
 * CIRKLE depends on. The Brain indexes OFFICIAL DOCS ONLY — never random
 * tutorials, Medium posts, or Stack Overflow threads — so every "how does
 * X work?" answer is grounded in the publisher's authoritative spec rather
 * than second-hand commentary.
 *
 * Backs the AIKE Documentation Index and the Engineering Assistant's RTFM
 * pathway. Trust heuristic: official documentation = 80-90.
 */
import type { DataSourceConfig } from "./types";

/** Matrix — federation protocol specification underlying Circle Wasl & Circle Mail. */
export const matrixDocs: DataSourceConfig = {
  id: "docs-matrix", name: "Matrix Protocol Documentation", category: "official_website",
  description: "Official Matrix protocol documentation — client-server, server-server (federation), application service, identity service APIs. The Brain's canonical reference for how Circle Wasl and Circle Mail federate.",
  urls: { api: "https://matrix.org/docs", docs: "https://spec.matrix.org" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** ActivityPub — W3C federated social-networking protocol (Circle Midan / The Circle). */
export const activityPubDocs: DataSourceConfig = {
  id: "docs-activitypub", name: "ActivityPub Specification (W3C)", category: "official_website",
  description: "W3C ActivityPub recommendation — federated social-networking protocol used by Circle Midan and The Circle. Canonical reference for actor, inbox, outbox, and federation semantics.",
  urls: { api: "https://www.w3.org/TR/activitypub", docs: "https://www.w3.org/TR/activitypub/" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** OIDC / OAuth2 — OpenID Foundation developer docs for Circle ID. */
export const oidcOAuth2Docs: DataSourceConfig = {
  id: "docs-oidc-oauth2", name: "OIDC / OAuth2 Developer Docs (OpenID Foundation)", category: "official_website",
  description: "OpenID Foundation developer documentation — OpenID Connect Core, OAuth 2.0 (RFC 6749), OAuth 2.1 draft, token exchange. The Brain's canonical reference for Circle ID authentication and federated login.",
  urls: { api: "https://openid.net/developers", docs: "https://openid.net/developers/" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** Flutter — official docs for the CIRKLE client UI framework. */
export const flutterDocs: DataSourceConfig = {
  id: "docs-flutter", name: "Flutter Documentation", category: "official_website",
  description: "Official Flutter documentation — widget catalogue, rendering pipeline, platform channels, state management, testing. The Brain's canonical reference for the CIRKLE mobile/desktop client.",
  urls: { api: "https://docs.flutter.dev", docs: "https://docs.flutter.dev" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** Dart — official docs for the language Flutter is built on. */
export const dartDocs: DataSourceConfig = {
  id: "docs-dart", name: "Dart Language Documentation", category: "official_website",
  description: "Official Dart language documentation — language tour, core libraries, async programming, package ecosystem. The Brain's canonical reference for every Dart-level question in the CIRKLE client.",
  urls: { api: "https://dart.dev/guides", docs: "https://dart.dev/guides" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** PostgreSQL — official docs for the primary relational database backing CIRKLE services. */
export const postgreSQLDocs: DataSourceConfig = {
  id: "docs-postgresql", name: "PostgreSQL Documentation", category: "official_website",
  description: "Official PostgreSQL documentation — SQL reference, extensions, replication, partitioning, tuning. The Brain's canonical reference for every CIRKLE schema, query, and migration question.",
  urls: { api: "https://www.postgresql.org/docs", docs: "https://www.postgresql.org/docs/" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** SQLite — official docs for the embedded SQL engine used on mobile and edge nodes. */
export const sqliteDocs: DataSourceConfig = {
  id: "docs-sqlite", name: "SQLite Documentation", category: "official_website",
  description: "Official SQLite documentation — SQL dialect, C API, virtual tables, file format. The Brain's canonical reference for the on-device storage layer of the CIRKLE client.",
  urls: { api: "https://www.sqlite.org/docs.html", docs: "https://www.sqlite.org/docs.html" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** Kubernetes — official docs for CIRKLE's container orchestration platform. */
export const kubernetesDocs: DataSourceConfig = {
  id: "docs-kubernetes", name: "Kubernetes Documentation", category: "official_website",
  description: "Official Kubernetes documentation — API reference, concepts, kubectl, scheduling, networking, storage, security. The Brain's canonical reference for every CIRKLE backend orchestration question.",
  urls: { api: "https://kubernetes.io/docs", docs: "https://kubernetes.io/docs/home/" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** Docker — official docs for the container engine used across CIRKLE services. */
export const dockerDocs: DataSourceConfig = {
  id: "docs-docker", name: "Docker Documentation", category: "official_website",
  description: "Official Docker documentation — Dockerfile reference, Compose, BuildKit, registry, Engine configuration. The Brain's canonical reference for every container build and runtime question in CIRKLE.",
  urls: { api: "https://docs.docker.com", docs: "https://docs.docker.com" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** OpenAPI — official docs for the API description specification used by every CIRKLE HTTP service. */
export const openApiDocs: DataSourceConfig = {
  id: "docs-openapi", name: "OpenAPI Specification", category: "official_website",
  description: "OpenAPI Initiative's specification documentation — OpenAPI 3.x, tooling, extensions. The Brain's canonical reference for describing and validating every HTTP API exposed by CIRKLE services.",
  urls: { api: "https://www.openapis.org", docs: "https://swagger.io/specification/" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** GraphQL — official docs for the query language and runtime powering CIRKLE's flexible APIs. */
export const graphQLDocs: DataSourceConfig = {
  id: "docs-graphql", name: "GraphQL Documentation", category: "official_website",
  description: "Official GraphQL Foundation documentation — query language, schema definition language, resolvers, federation. The Brain's canonical reference for CIRKLE's flexible read/write APIs.",
  urls: { api: "https://graphql.org/learn", docs: "https://graphql.org/learn" }, trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** OpenStreetMap — wiki + API docs for the planet's open map data. */
export const openStreetMapDocs: DataSourceConfig = {
  id: "docs-openstreetmap", name: "OpenStreetMap Wiki & API", category: "openstreetmap",
  description: "OpenStreetMap project wiki and API documentation — tagging schema, Overpass API, Nominatim geocoding, planet dump structure. The Brain's canonical reference for CIRKLE's mapping and geocoding stack.",
  urls: { api: "https://wiki.openstreetmap.org", docs: "https://wiki.openstreetmap.org/wiki/API" }, trustScore: 85, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** IPFS — official docs for the InterPlanetary File System (CIRKLE content storage). */
export const ipfsDocs: DataSourceConfig = {
  id: "docs-ipfs", name: "IPFS Documentation", category: "official_website",
  description: "Official IPFS documentation — content addressing, DAG, bitswap, gateways, pinning services. The Brain's canonical reference for CIRKLE's decentralized content storage and addressing layer.",
  urls: { api: "https://docs.ipfs.io", docs: "https://docs.ipfs.io" }, trustScore: 85, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** libp2p — official docs for the modular P2P networking stack. */
export const libp2pDocs: DataSourceConfig = {
  id: "docs-libp2p", name: "libp2p Documentation", category: "official_website",
  description: "Official libp2p documentation — peer routing, discovery, pubsub, transports, security channels. The Brain's canonical reference for the Local Mesh networking stack inside CIRKLE.",
  urls: { api: "https://docs.libp2p.io", docs: "https://docs.libp2p.io" }, trustScore: 85, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** ONNX Runtime — official docs for cross-platform ML inference engine. */
export const onnxRuntimeDocs: DataSourceConfig = {
  id: "docs-onnx-runtime", name: "ONNX Runtime Documentation", category: "official_website",
  description: "Official ONNX Runtime documentation — execution providers (CPU, CUDA, CoreML, NNAPI), model optimisation, C/C++/Python/JS API. The Brain's canonical reference for executing specialised expert models.",
  urls: { api: "https://onnxruntime.ai/docs", docs: "https://onnxruntime.ai/docs" }, trustScore: 85, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** PeerTube — official docs for the federated video platform (Mashahd federation reference). */
export const peerTubeDocs: DataSourceConfig = {
  id: "docs-peertube", name: "PeerTube Documentation", category: "official_website",
  description: "Official PeerTube documentation — ActivityPub video federation, transcoding, plugin system. The Brain's canonical reference for how Circle Mashahd federates with the wider PeerTube universe.",
  urls: { api: "https://docs.joinpeertube.org", docs: "https://docs.joinpeertube.org" }, trustScore: 80, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** Mailcow — official docs for the self-hosted mail server (Circle Mail backend). */
export const mailcowDocs: DataSourceConfig = {
  id: "docs-mailcow", name: "Mailcow Documentation", category: "official_website",
  description: "Official Mailcow documentation — Dockerised mail server (Dovecot, Postfix, SOGo, Rspamd). The Brain's canonical reference for the SMTP/IMAP backend behind Circle Mail.",
  urls: { api: "https://docs.mailcow.email", docs: "https://docs.mailcow.email" }, trustScore: 80, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** NTFY — official docs for the open push-notification service. */
export const ntfyDocs: DataSourceConfig = {
  id: "docs-ntfy", name: "NTFY Documentation", category: "official_website",
  description: "Official NTFY documentation — pub/sub push-notification HTTP API used by CIRKLE for cross-device notification delivery. The Brain's canonical reference for CIRKLE's notification transport.",
  urls: { api: "https://docs.ntfy.sh", docs: "https://docs.ntfy.sh" }, trustScore: 80, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["protocol-specifications", "api-reference", "integration-guide", "schema-definitions", "best-practices"], coverage: ["global"], requiresApiKey: false, free: true,
};

/** All documentation-library sources, in descending trust order. */
export const docsLibrarySources: DataSourceConfig[] = [
  matrixDocs, activityPubDocs, oidcOAuth2Docs, flutterDocs, dartDocs,
  postgreSQLDocs, sqliteDocs, kubernetesDocs, dockerDocs, openApiDocs, graphQLDocs,
  openStreetMapDocs, ipfsDocs, libp2pDocs, onnxRuntimeDocs,
  peerTubeDocs, mailcowDocs, ntfyDocs,
];

export default docsLibrarySources;
