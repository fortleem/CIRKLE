/**
 * CIRKLE Brain AI — OpenAPI Documentation Generator (Upgrade 5)
 * ============================================================================
 * Auto-generates OpenAPI 3.1 spec for all CIRKLE Brain AI APIs.
 * Serves at /api/docs as JSON + Swagger UI at /api/docs/ui.
 * ============================================================================
 */

export interface OpenAPIPath {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, { description: string; content?: unknown }>;
  security?: unknown[];
}

export function generateOpenAPISpec(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  // ── AI Phase Endpoints ──────────────────────────────────────────────
  const phaseEndpoints = [
    { path: "/api/brain/status", method: "get", tag: "Brain", summary: "Brain AI status + provider availability" },
    { path: "/api/brain/cross-evaluate", method: "post", tag: "Brain", summary: "Cross-evaluate query across 5 AI providers" },
    { path: "/api/cognitive/status", method: "get", tag: "Cognitive", summary: "Shared Cognitive Foundation status" },
    { path: "/api/cognitive/capabilities", method: "get", tag: "Cognitive", summary: "List/search registered capabilities" },
    { path: "/api/cognitive/context", method: "post", tag: "Cognitive", summary: "Context lifecycle + cognitive pipeline" },
    { path: "/api/uob/status", method: "get", tag: "UOB", summary: "Universal Orchestration Brain status" },
    { path: "/api/uob/plan", method: "post", tag: "UOB", summary: "Generate execution plan from user goal" },
    { path: "/api/tee/status", method: "get", tag: "TEE", summary: "Trusted Execution Engine status" },
    { path: "/api/tee/execute", method: "post", tag: "TEE", summary: "Execute an approved execution plan" },
    { path: "/api/tee/executions", method: "get", tag: "TEE", summary: "List/get execution records" },
    { path: "/api/liee/status", method: "get", tag: "LIEE", summary: "Learning & Intelligence Evolution Engine status" },
    { path: "/api/liee/feedback", method: "post", tag: "LIEE", summary: "Submit feedback for learning" },
    { path: "/api/liee/patterns", method: "get", tag: "LIEE", summary: "List detected learning patterns" },
    { path: "/api/liee/proposals", method: "get", tag: "LIEE", summary: "List optimization proposals" },
    { path: "/api/cie/status", method: "get", tag: "CIE", summary: "Capability Intelligence Engine status" },
    { path: "/api/cie/discover", method: "get", tag: "CIE", summary: "Discover capabilities/partners/government services" },
    { path: "/api/cie/graph", method: "get", tag: "CIE", summary: "Knowledge graph queries" },
    { path: "/api/cie/countries", method: "get", tag: "CIE", summary: "Country intelligence" },
    { path: "/api/tgse/status", method: "get", tag: "TGSE", summary: "Trust, Governance & Safety Engine status" },
    { path: "/api/tgse/validate", method: "post", tag: "TGSE", summary: "Validate an action through governance pipeline" },
    { path: "/api/tgse/audit", method: "get", tag: "TGSE", summary: "Query immutable audit records" },
    { path: "/api/tgse/approvals", method: "get", tag: "TGSE", summary: "List/approve/reject human approval requests" },
    { path: "/api/pcpf/status", method: "get", tag: "PCPF", summary: "Platform Capability Pack Framework status" },
    { path: "/api/pcpf/packs", method: "get", tag: "PCPF", summary: "List/install capability packs" },
    { path: "/api/pcpf/install", method: "post", tag: "PCPF", summary: "Install/upgrade/rollback capability packs" },
    { path: "/api/account/diagnose", method: "post", tag: "AHG", summary: "Auto-diagnose account problems" },
    { path: "/api/account/propose-fix", method: "post", tag: "AHG", summary: "Get proposed fixes for a diagnosed problem" },
    { path: "/api/account/consent-fix", method: "post", tag: "AHG", summary: "Execute a fix with user consent" },
    { path: "/api/recommend", method: "post", tag: "IRDE", summary: "IRDE recommendation engine" },
    { path: "/api/memory", method: "get", tag: "PMB", summary: "Personal Memory Brain — retrieve/search memories" },
    { path: "/api/health", method: "get", tag: "System", summary: "Health check endpoint" },
    { path: "/api/docs", method: "get", tag: "System", summary: "OpenAPI specification" },
  ];

  for (const ep of phaseEndpoints) {
    if (!paths[ep.path]) paths[ep.path] = {};
    paths[ep.path][ep.method] = {
      summary: ep.summary,
      description: ep.summary,
      tags: [ep.tag],
      responses: {
        "200": { description: "Successful response" },
        "401": { description: "Authentication required" },
        "429": { description: "Rate limit exceeded" },
        "500": { description: "Internal server error" },
      },
      security: [{ apiKeyAuth: [] }, { sessionAuth: [] }],
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "CIRKLE Brain AI API",
      version: "9.0.0",
      description: "The proprietary intelligence operating system powering the CIRKLE Super App. 9 phases, 158 routes, one unified cognitive architecture.",
      contact: { name: "CIRKLE", url: "https://cirkle.app" },
    },
    servers: [
      { url: "/", description: "Current server" },
    ],
    components: {
      securitySchemes: {
        apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        sessionAuth: { type: "apiKey", in: "cookie", name: "next-auth.session-token" },
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
    paths,
    tags: [
      { name: "Brain", description: "Core Brain AI (cross-evaluation, providers)" },
      { name: "Cognitive", description: "Shared Cognitive Foundation (Context Manager, Capability Registry)" },
      { name: "UOB", description: "Universal Orchestration Brain (Phase 5)" },
      { name: "TEE", description: "Trusted Execution Engine (Phase 6)" },
      { name: "LIEE", description: "Learning & Intelligence Evolution Engine (Phase 7)" },
      { name: "CIE", description: "Capability Intelligence Engine (Phase 8)" },
      { name: "TGSE", description: "Trust, Governance & Safety Engine (Phase 9)" },
      { name: "PCPF", description: "Platform Capability Pack Framework" },
      { name: "AHG", description: "Account Health Guardian" },
      { name: "IRDE", description: "Intelligent Recommendation & Decision Engine (Phase 4)" },
      { name: "PMB", description: "Personal Memory Brain (Phase 2)" },
      { name: "System", description: "System endpoints (health, docs)" },
    ],
  };
}
