/**
 * CIRKLE — API Input Validation Middleware (Production Recommendation #4)
 * ============================================================================
 * A thin wrapper around `zod` that validates the JSON body of an API route
 * handler BEFORE the handler runs. On validation failure it returns a 400
 * with a structured error payload so the client can render the issues.
 *
 * Usage:
 *   import { validateBody, z } from "@/lib/api-validation";
 *
 *   const schema = z.object({
 *     username: z.string().min(3),
 *     password: z.string().min(6),
 *   });
 *
 *   export const POST = validateBody(schema, async (req, body) => {
 *     // body is fully typed as z.infer<typeof schema>
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * Routes with dynamic params (App Router) pass the context as the 3rd arg:
 *   export const POST = validateBody(schema, async (req, body, ctx) => {
 *     const { id } = await ctx.params;
 *     ...
 *   });
 *
 * The wrapper is generic over the Request subtype so it works seamlessly
 * with Next.js `NextRequest` (or any other `Request` extension) without
 * contravariance complaints under `strictFunctionTypes`.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { z } from "zod";

export { z };

/** Re-export so callers can import everything from one place. */
export type Schema<T> = z.ZodType<T>;

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
  code: string;
}

export interface ValidationFailure {
  error: "validation_failed";
  issues: ValidationIssue[];
}

/**
 * Wrap an API route handler with zod body validation.
 *
 * - On invalid JSON → 400 `{ error: "invalid_json" }`
 * - On validation failure → 400 `{ error: "validation_failed", issues: [...] }`
 * - On success → delegates to `handler` with the parsed, typed body
 *
 * The wrapper passes through any extra arguments (e.g. the App Router
 * `ctx` with `params`) so it works with both simple and dynamic routes.
 *
 * Generic over `R extends Request` so handlers typed with `NextRequest`
 * compose without `strictFunctionTypes` errors.
 */
export function validateBody<
  T,
  R extends Request,
  Args extends unknown[],
>(
  schema: z.ZodType<T>,
  handler: (req: R, body: T, ...rest: Args) => Promise<Response | NextResponse> | Response | NextResponse,
): (req: R, ...rest: Args) => Promise<Response | NextResponse> {
  return async function validated(req: R, ...rest: Args): Promise<Response | NextResponse> {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "request body is not valid JSON" },
        { status: 400 },
      );
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issues: ValidationIssue[] = parsed.error.issues.map((iss) => ({
        path: iss.path.map((p) => p),
        message: iss.message,
        code: iss.code,
      }));
      return NextResponse.json<ValidationFailure>(
        { error: "validation_failed", issues },
        { status: 400 },
      );
    }

    return handler(req, parsed.data, ...rest);
  };
}

/**
 * Validate a query-string shape against a zod schema. Useful for GET routes
 * where the input lives in the URL search params. Coerces all values to
 * strings (as `URLSearchParams` does) — use `z.coerce.number()` etc. for
 * non-string fields.
 *
 *   export const GET = validateQuery(schema, async (req, query) => { ... });
 */
export function validateQuery<
  T,
  R extends Request,
  Args extends unknown[],
>(
  schema: z.ZodType<T>,
  handler: (req: R, query: T, ...rest: Args) => Promise<Response | NextResponse> | Response | NextResponse,
): (req: R, ...rest: Args) => Promise<Response | NextResponse> {
  return async function validated(req: R, ...rest: Args): Promise<Response | NextResponse> {
    const url = new URL(req.url);
    const raw: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) raw[k] = v;

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issues: ValidationIssue[] = parsed.error.issues.map((iss) => ({
        path: iss.path.map((p) => p),
        message: iss.message,
        code: iss.code,
      }));
      return NextResponse.json<ValidationFailure>(
        { error: "validation_failed", issues },
        { status: 400 },
      );
    }
    return handler(req, parsed.data, ...rest);
  };
}
