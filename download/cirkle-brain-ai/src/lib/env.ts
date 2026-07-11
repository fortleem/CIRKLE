const required = ["DATABASE_URL"] as const;
const optional = ["GROQ_API_KEY", "OPENAI_API_KEY", "HUGGINGFACE_API_KEY"] as const;
export function validateEnv() { const missing = required.filter((key) => !process.env[key]); if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(", ")}`); const configured: string[] = []; for (const key of optional) { if (process.env[key]) configured.push(key); } return { configured }; }
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") { try { validateEnv(); } catch (e) { console.warn("[env]", (e as Error).message); } }
