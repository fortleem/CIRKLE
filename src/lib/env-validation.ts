/**
 * CIRKLE Environment Validation
 * ============================================================================
 *
 * P0.1 — Environment/Secret Persistence
 *
 * Validates that all required environment variables exist at startup.
 * Fails loudly (console.error + throws) when required configuration is missing.
 *
 * This module prevents silent degradation when .env is corrupted or missing.
 *
 * Usage:
 *   import { validateEnv, getEnvStatus } from "@/lib/env-validation";
 *   validateEnv(); // Call at startup — throws if critical vars missing
 *   const status = getEnvStatus(); // Returns status report
 * ============================================================================
 */

import "server-only";

// ── Required Environment Variables ────────────────────────────────────────

interface EnvVarSpec {
  name: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  sensitive: boolean;
}

const ENV_VARS: EnvVarSpec[] = [
  {
    name: "DATABASE_URL",
    required: true,
    description: "SQLite database connection string",
    defaultValue: "file:./db/custom.db",
    sensitive: false,
  },
  {
    name: "GROQ_API_KEY",
    required: false,
    description: "Groq AI provider key (llama-3.3-70b-versatile)",
    sensitive: true,
  },
  {
    name: "GEMINI_API_KEY",
    required: false,
    description: "Google Gemini AI provider key (gemini-2.0-flash)",
    sensitive: true,
  },
  {
    name: "OPENROUTER_API_KEY",
    required: false,
    description: "OpenRouter API key (web search via :online models)",
    sensitive: true,
  },
  {
    name: "HUGGINGFACE_API_KEY",
    required: false,
    description: "HuggingFace inference API key (Mistral-7B)",
    sensitive: true,
  },
  {
    name: "OPENAI_API_KEY",
    required: false,
    description: "OpenAI API key (gpt-4o-mini, used for non-news Brain functions)",
    sensitive: true,
  },
  {
    name: "VERCEL",
    required: false,
    description: "Set automatically by Vercel (not needed in dev)",
    sensitive: false,
  },
  {
    name: "NODE_ENV",
    required: false,
    description: "Environment (development/production)",
    defaultValue: "development",
    sensitive: false,
  },
];

// ── Validation ────────────────────────────────────────────────────────────

export interface EnvStatus {
  total: number;
  set: number;
  missing: string[];
  missingRequired: string[];
  allRequiredPresent: boolean;
  details: Array<{
    name: string;
    set: boolean;
    required: boolean;
    description: string;
  }>;
}

/**
 * Check all environment variables and return a status report.
 * Does NOT throw — safe to call for status display.
 */
export function getEnvStatus(): EnvStatus {
  const details = ENV_VARS.map((spec) => ({
    name: spec.name,
    set: !!process.env[spec.name],
    required: spec.required,
    description: spec.description,
  }));

  const missing = ENV_VARS.filter((spec) => !process.env[spec.name]).map((s) => s.name);
  const missingRequired = ENV_VARS.filter(
    (spec) => spec.required && !process.env[spec.name] && !spec.defaultValue,
  ).map((s) => s.name);

  return {
    total: ENV_VARS.length,
    set: ENV_VARS.length - missing.length,
    missing,
    missingRequired,
    allRequiredPresent: missingRequired.length === 0,
    details,
  };
}

/**
 * Validate environment variables at startup.
 * Throws if any REQUIRED variable is missing.
 * Logs warnings for optional but recommended variables.
 */
export function validateEnv(): void {
  const status = getEnvStatus();

  // Apply defaults
  for (const spec of ENV_VARS) {
    if (!process.env[spec.name] && spec.defaultValue) {
      process.env[spec.name] = spec.defaultValue;
    }
  }

  // Check required
  if (status.missingRequired.length > 0) {
    console.error("❌ CIRKLE ENV VALIDATION FAILED");
    console.error("   Missing required environment variables:");
    for (const name of status.missingRequired) {
      const spec = ENV_VARS.find((s) => s.name === name);
      console.error(`   - ${name}: ${spec?.description || "required"}`);
    }
    console.error("");
    console.error("   Set these in .env (or Vercel dashboard for production).");
    throw new Error(`Missing required environment variables: ${status.missingRequired.join(", ")}`);
  }

  // Warn about optional
  const optionalMissing = status.missing.filter((name) => !status.missingRequired.includes(name));
  if (optionalMissing.length > 0) {
    console.warn("⚠️  CIRKLE ENV WARNING: Optional variables not set:");
    for (const name of optionalMissing) {
      const spec = ENV_VARS.find((s) => s.name === name);
      console.warn(`   - ${name}: ${spec?.description || "optional"}`);
    }
    console.warn("   Some features may be degraded (AI providers, news generation, etc.)");
  }
}

/**
 * Get a single environment variable, with optional default.
 * Use this instead of direct process.env access for centralized validation.
 */
export function getEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

/**
 * Check if a specific AI provider key is available.
 */
export function isProviderAvailable(provider: string): boolean {
  const keyMap: Record<string, string> = {
    groq: "GROQ_API_KEY",
    gemini: "GEMINI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    huggingface: "HUGGINGFACE_API_KEY",
    openai: "OPENAI_API_KEY",
  };
  const envVar = keyMap[provider.toLowerCase()];
  return envVar ? !!process.env[envVar] : false;
}
