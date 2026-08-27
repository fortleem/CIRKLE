// @ts-nocheck
/**
 * POST /api/institutions/register
 * ============================================================================
 * Register a new institution. The founder (personal User) must already exist.
 *
 * Body:
 *   {
 *     founderHandle: string,       // personal @cirkle handle of the founder
 *     name: string,                // institution display name
 *     handle: string,              // institution @handle (unique)
 *     country: string,            // ISO-2 country code
 *     companyType: string,        // llc, sole_proprietorship, etc.
 *     industry?: string,
 *     emails: string[],            // registered email addresses
 *     phones?: string[],
 *     addresses?: string[],
 *     documents: [{ type, fileName, fileHash }],  // uploaded docs
 *     registrationNumber?: string,
 *     taxId?: string,
 *   }
 *
 * Returns:
 *   { success, institution: { id, handle, verificationStatus } }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequiredDocs } from "@/lib/institution-docs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const founderHandle = typeof body?.founderHandle === "string" ? body.founderHandle.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const handle = typeof body?.handle === "string" ? body.handle.trim().toLowerCase() : "";
    const country = typeof body?.country === "string" ? body.country.trim().toUpperCase() : "";
    const companyType = typeof body?.companyType === "string" ? body.companyType.trim().toLowerCase() : "";

    if (!founderHandle || !name || !handle || !country || !companyType) {
      return NextResponse.json(
        { error: "founderHandle, name, handle, country, companyType are all required" },
        { status: 400 },
      );
    }

    // ── Validate founder exists ────────────────────────────────────────────
    const founder = await db.user.findFirst({
      where: { circleId: founderHandle },
      select: { id: true, displayName: true },
    });
    if (!founder) {
      return NextResponse.json(
        { error: "Founder personal account not found. Please register a personal account first." },
        { status: 404 },
      );
    }

    // ── Validate handle is unique ──────────────────────────────────────────
    const existing = await db.institution.findFirst({
      where: { handle },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Handle @${handle} is already taken by another institution.` },
        { status: 409 },
      );
    }

    // ── Validate required documents ────────────────────────────────────────
    const requiredDocs = getRequiredDocs(country, companyType);
    const uploadedDocs: Array<{ type: string; fileName: string; fileHash?: string }> =
      Array.isArray(body?.documents) ? body.documents : [];
    const uploadedKeys = new Set(uploadedDocs.map(d => d.type));

    const missingDocs = requiredDocs.filter(doc => !uploadedKeys.has(doc.key));
    if (missingDocs.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required documents",
          missingDocs: missingDocs.map(d => ({
            key: d.key,
            label: d.labelEn,
            labelAr: d.labelAr,
            description: d.description,
          })),
        },
        { status: 400 },
      );
    }

    // ── Create the institution ─────────────────────────────────────────────
    const institution = await db.institution.create({
      data: {
        founderId: founder.id,
        name,
        handle,
        country,
        companyType,
        industry: typeof body?.industry === "string" ? body.industry : "",
        emails: JSON.stringify(Array.isArray(body?.emails) ? body.emails : []),
        phones: JSON.stringify(Array.isArray(body?.phones) ? body.phones : []),
        addresses: JSON.stringify(Array.isArray(body?.addresses) ? body.addresses : []),
        documents: JSON.stringify(
          uploadedDocs.map(d => ({
            ...d,
            uploadedAt: new Date().toISOString(),
            verified: false,
          })),
        ),
        registrationNumber: body?.registrationNumber || null,
        taxId: body?.taxId || null,
        avatarInitials: name.slice(0, 2).toUpperCase(),
        verificationStatus: "pending",
      },
      select: {
        id: true,
        handle: true,
        name: true,
        country: true,
        companyType: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        institution: {
          ...institution,
          message: "Institution registered. Documents are pending review. You will be notified when verification is complete.",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "registration_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
