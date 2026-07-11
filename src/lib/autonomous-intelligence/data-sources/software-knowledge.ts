// @ts-nocheck
import "server-only";

/**
 * Software Knowledge Sources — Phase 7.5 AIKE
 * ============================================================================
 * Code-hosting platforms, package registries, model hubs, and official
 * documentation feeds that teach the Brain how every technology in CIRKLE
 * works — from Flutter widgets to Kubernetes operators, from Matrix
 * federation events to ActivityPub actors. The Brain reads READMEs, API
 * references, dependency manifests, and changelogs to build a living
 * mental model of the platform's own stack.
 *
 * Backs the AIKE Software Knowledge module and the Engineering Assistant
 * inside the Brain. Trust heuristic: official documentation = 85-90,
 * community-curated = 75-85.
 */
import type { DataSourceConfig } from "./types";

/** Kubernetes docs — official reference for the container orchestration platform powering CIRKLE's backend. */
export const kubernetesDocs: DataSourceConfig = {
  id: "kubernetes-docs",
  name: "Kubernetes Documentation",
  category: "official_website",
  description: "Official Kubernetes documentation — API reference, concepts, kubectl, scheduling, networking, storage, security. The Brain's authority for every claim about how the CIRKLE backend is orchestrated.",
  urls: { api: "https://kubernetes.io/docs", docs: "https://kubernetes.io/docs/home/" },
  trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** Flutter docs — official reference for CIRKLE's cross-platform client UI framework. */
export const flutterDocs: DataSourceConfig = {
  id: "flutter-docs",
  name: "Flutter Documentation",
  category: "official_website",
  description: "Official Flutter documentation — widget catalogue, rendering pipeline, platform channels, state management, testing. The Brain's authority for how the CIRKLE mobile/desktop client is built.",
  urls: { api: "https://docs.flutter.dev", docs: "https://docs.flutter.dev" },
  trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** Matrix docs — specification for the federated messaging protocol underlying Circle Mail / Wasl. */
export const matrixDocs: DataSourceConfig = {
  id: "matrix-docs",
  name: "Matrix Protocol Documentation",
  category: "official_website",
  description: "Official Matrix protocol documentation — client-server, server-server (federation), application service, identity service APIs. The Brain's authority for how Circle Wasl and Circle Mail federate.",
  urls: { api: "https://matrix.org/docs", docs: "https://spec.matrix.org" },
  trustScore: 90, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** ActivityPub docs — W3C recommendation for federated social networking (Circle Midan / The Circle). */
export const activityPubDocs: DataSourceConfig = {
  id: "activitypub-docs",
  name: "ActivityPub Specification (W3C)",
  category: "official_website",
  description: "W3C ActivityPub recommendation — the federated social-networking protocol used by Circle Midan and The Circle groups. The Brain's authority for actor, inbox, outbox, and federation semantics.",
  urls: { api: "https://www.w3.org/TR/activitypub", docs: "https://www.w3.org/TR/activitypub/" },
  trustScore: 85, format: "json", updateFrequency: "weekly", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** GitHub — world's largest source-code host; REST + GraphQL APIs over repos, issues, PRs, releases. */
export const github: DataSourceConfig = {
  id: "github",
  name: "GitHub REST & GraphQL API",
  category: "partner_api",
  description: "World's largest source-code host — REST and GraphQL APIs over repositories, issues, pull requests, releases, code search, and dependency graphs. The Brain's primary feed for tracking upstream changes to every CIRKLE dependency.",
  urls: { api: "https://api.github.com", docs: "https://docs.github.com" },
  trustScore: 85, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: true, free: true, rateLimitPerMin: 60,
};

/** GitLab — source-code host with built-in CI/CD; used by self-hosted CIRKLE mirrors. */
export const gitLab: DataSourceConfig = {
  id: "gitlab",
  name: "GitLab API",
  category: "partner_api",
  description: "Source-code host with built-in CI/CD, package registry, and container registry — used by CIRKLE for self-hosted mirrors and for tracking dependencies hosted only on GitLab.",
  urls: { api: "https://gitlab.com/api/v4", docs: "https://docs.gitlab.com/ee/api/" },
  trustScore: 80, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: true, free: true, rateLimitPerMin: 60,
};

/** HuggingFace — model + dataset hub; central to the Brain's ML ecosystem. */
export const huggingFace: DataSourceConfig = {
  id: "huggingface-hub",
  name: "Hugging Face Hub",
  category: "partner_api",
  description: "Model and dataset hub — Hub API over 500k+ ML models, 100k+ datasets, and Spaces. The Brain's primary feed for discovering candidate specialised experts, tracking dataset releases, and resolving model cards.",
  urls: { api: "https://huggingface.co", docs: "https://huggingface.co/docs/hub/api" },
  trustScore: 85, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: true, free: true, rateLimitPerMin: 60,
};

/** PyPI — Python Package Index; resolves every Python dependency the Brain's services use. */
export const pypi: DataSourceConfig = {
  id: "pypi",
  name: "Python Package Index (PyPI)",
  category: "commerce_api",
  description: "Python Package Index JSON API — release metadata, dependencies, hashes, and yanked flags for every Python package. The Brain's authority for every claim about a Python dependency's current version.",
  urls: { api: "https://pypi.org/pypi/", docs: "https://warehouse.pypa.io/api-reference/" },
  trustScore: 85, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** npm — JavaScript package registry; resolves every JS dependency the CIRKLE client uses. */
export const npm: DataSourceConfig = {
  id: "npm-registry",
  name: "npm Package Registry",
  category: "commerce_api",
  description: "npm package registry — release metadata, dependency trees, tarball hashes, download counts for every JavaScript package. The Brain's authority for every claim about a JS/TS dependency's supply-chain posture.",
  urls: { api: "https://registry.npmjs.org", docs: "https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md" },
  trustScore: 85, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** Rust Crates — crates.io package registry for Rust dependencies (CIRKLE-native tools). */
export const rustCrates: DataSourceConfig = {
  id: "rust-crates",
  name: "crates.io (Rust Registry)",
  category: "commerce_api",
  description: "crates.io Rust package registry — release metadata, dependency graphs, download counts, yanked flags for every Rust crate. The Brain's authority for Rust dependencies (CIRKLE-native CLI tools, agents, daemons).",
  urls: { api: "https://crates.io/api/v1", docs: "https://doc.rust-lang.org/cargo/reference/registry-web-api.html" },
  trustScore: 85, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** Docker Hub — container image registry; tracks base images used across CIRKLE services. */
export const dockerHub: DataSourceConfig = {
  id: "docker-hub",
  name: "Docker Hub Registry",
  category: "commerce_api",
  description: "Docker Hub container image registry — image manifests, tags, digests, vulnerability scans for the base images used across every CIRKLE service container.",
  urls: { api: "https://hub.docker.com", docs: "https://docs.docker.com/docker-hub/api/latest" },
  trustScore: 80, format: "json", updateFrequency: "realtime", integrationMethod: "api_call",
  capabilities: ["code-patterns", "api-documentation", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true, rateLimitPerMin: 100,
};

/** Awesome Lists — community-curated topic lists; entry-point for technology discovery. */
export const awesomeLists: DataSourceConfig = {
  id: "awesome-lists",
  name: "Awesome Lists (Curated Catalogues)",
  category: "public_api",
  description: "Community-curated catalogue of 'awesome-X' topic lists on GitHub — entry-point for technology discovery when the Brain is researching an unfamiliar domain (awesome-selfhosted, awesome-federated, awesome-ml-pipelines).",
  urls: { download: "https://github.com/sindresorhus/awesome", docs: "https://github.com/sindresorhus/awesome" },
  trustScore: 75, format: "dump", updateFrequency: "weekly", integrationMethod: "dump_download",
  capabilities: ["code-patterns", "dependency-analysis", "technology-trends", "integration-patterns", "best-practices"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** All software-knowledge sources, in descending trust order. */
export const softwareKnowledgeSources: DataSourceConfig[] = [
  kubernetesDocs, flutterDocs, matrixDocs, activityPubDocs,
  github, huggingFace, pypi, npm, rustCrates, dockerHub, gitLab, awesomeLists,
];

export default softwareKnowledgeSources;
