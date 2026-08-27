// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createRule, listAllRules, updateRule } from "@/lib/policy-engine";

/**
 * GET /api/policy/rules — list all policy rules.
 *   Query: ?institution=<>&category=<>
 * POST /api/policy/rules — create a new rule.
 *   Body: { institution, name, category, condition, action, ... }
 * PATCH /api/policy/rules — update an existing rule.
 *   Body: { ruleId, patch, updatedBy }
 */
export async function GET(req: NextRequest) {
  try {
    const institution = req.nextUrl.searchParams.get("institution") ?? undefined;
    const category = req.nextUrl.searchParams.get("category") ?? undefined;
    let rules = listAllRules();
    if (institution) {
      rules = rules.filter(
        (r) => r.institution === institution || r.institution === "global",
      );
    }
    if (category) {
      rules = rules.filter((r) => r.category === category);
    }
    return NextResponse.json(
      { rules, count: rules.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.institution || !body.name || !body.category || !body.condition || !body.action) {
      return NextResponse.json(
        { error: "Missing required fields: institution, name, category, condition, action" },
        { status: 400 },
      );
    }
    const rule = await createRule({
      institution: body.institution,
      region: body.region,
      service: body.service,
      name: body.name,
      description: body.description,
      category: body.category,
      condition: body.condition,
      action: body.action,
      authority: body.authority,
      effectiveDate: body.effectiveDate,
      expiryDate: body.expiryDate,
      createdBy: body.createdBy ?? "api",
    });
    return NextResponse.json({ rule, created: true }, { status: 201 });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.ruleId || !body.patch || !body.updatedBy) {
      return NextResponse.json(
        { error: "Missing required fields: ruleId, patch, updatedBy" },
        { status: 400 },
      );
    }
    const rule = await updateRule(body.ruleId, body.patch, body.updatedBy);
    return NextResponse.json({ rule, updated: true });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
