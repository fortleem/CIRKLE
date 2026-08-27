// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { evaluatePolicy, evaluatePolicySet } from "@/lib/policy-engine";

/**
 * POST /api/policy/evaluate
 *
 * Evaluate a policy (or full policy set) against an input scenario.
 * Returns decision: allow | deny | require_approval | escalate.
 *
 * Body shapes:
 *   1. Single rule:
 *        { ruleId, input }
 *   2. Full set (recommended for institutional callers):
 *        { input: { institution, category, purpose, ... } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    // Single-rule evaluation.
    if (body.ruleId) {
      if (!body.input) {
        return NextResponse.json(
          { error: "Missing input object to evaluate against" },
          { status: 400 },
        );
      }
      const evaluation = await evaluatePolicy(body.ruleId, body.input);
      return NextResponse.json(evaluation, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Full set evaluation.
    if (!body.input) {
      return NextResponse.json(
        { error: "Missing input object to evaluate against" },
        { status: 400 },
      );
    }
    const result = await evaluatePolicySet(body.input);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
