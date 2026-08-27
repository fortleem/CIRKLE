// @ts-nocheck
/**
 * GET  /api/federation/institutions
 * POST /api/federation/institutions
 * ============================================================================
 * Federation Government Institution Registry API.
 *
 * GET: list registered government institutions. Optional query params:
 *   ?type=            — filter by InstitutionType (aca|police|ems|fire|traffic|health|local_gov|regulator|financial|other)
 *   ?status=          — filter by InstitutionStatus (active|pending_verification|stale|suspended|retired)
 *   ?country=         — ISO-3166-1 alpha-2 country code
 *
 * POST: register a new government institution. Body:
 *   { name, authority, type, services?, officialChannels?, integrations?, status?, dataClassification?, country?, jurisdiction?, notes? }
 *
 * Returns the registry entry. The institution is created at Level 0
 * (Directory) by default — integrations declared in the body are
 * recorded but not activated (activation requires the Authority Matrix,
 * which is a separate governance artifact).
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  listInstitutions,
  registerInstitution,
  type InstitutionType,
  type InstitutionStatus,
} from "@/lib/institution-registry";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<InstitutionType>([
  "aca", "police", "ems", "fire", "traffic",
  "health", "local_gov", "regulator", "financial", "other",
]);
const ALLOWED_STATUSES = new Set<InstitutionStatus>([
  "active", "pending_verification", "stale", "suspended", "retired",
]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const country = url.searchParams.get("country")?.trim().toUpperCase() || "";

    const filter: any = {};
    if (type && ALLOWED_TYPES.has(type as InstitutionType)) filter.type = type;
    if (status && ALLOWED_STATUSES.has(status as InstitutionStatus)) filter.status = status;
    if (country) filter.country = country;

    const institutions = await listInstitutions(filter);
    return NextResponse.json(
      { total: institutions.length, institutions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_list_institutions", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json({ error: "missing_name" }, { status: 400 });
    }
    if (!body.authority || typeof body.authority !== "string") {
      return NextResponse.json({ error: "missing_authority" }, { status: 400 });
    }
    if (!body.type || !ALLOWED_TYPES.has(body.type)) {
      return NextResponse.json(
        { error: "invalid_type", allowed: Array.from(ALLOWED_TYPES) },
        { status: 400 },
      );
    }

    const inst = await registerInstitution({
      name: body.name,
      authority: body.authority,
      type: body.type as InstitutionType,
      services: Array.isArray(body.services) ? body.services : [],
      officialChannels: Array.isArray(body.officialChannels) ? body.officialChannels : [],
      integrations: Array.isArray(body.integrations) ? body.integrations : [],
      status: body.status && ALLOWED_STATUSES.has(body.status)
        ? body.status
        : "pending_verification",
      dataClassification: body.dataClassification || "public",
      country: body.country,
      jurisdiction: body.jurisdiction,
      notes: body.notes,
    });

    return NextResponse.json({ institution: inst }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_register_institution", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
