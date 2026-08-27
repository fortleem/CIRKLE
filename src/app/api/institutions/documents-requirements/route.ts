// @ts-nocheck
/**
 * GET  /api/institutions/documents-requirements?country=EG&companyType=llc
 * ============================================================================
 * Returns the list of required documents for registering an institution in
 * a specific country with a specific company type.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { getRequiredDocs, getSupportedCountries, COMPANY_TYPES } from "@/lib/institution-docs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const country = url.searchParams.get("country")?.trim().toUpperCase() || "";
  const companyType = url.searchParams.get("companyType")?.trim().toLowerCase() || "";

  if (!country || !companyType) {
    // Return the full matrix overview.
    return NextResponse.json({
      supportedCountries: getSupportedCountries(),
      companyTypes: COMPANY_TYPES,
      usage: "GET /api/institutions/documents-requirements?country=EG&companyType=llc",
    });
  }

  const docs = getRequiredDocs(country, companyType);

  return NextResponse.json(
    {
      country,
      companyType,
      companyTypeLabel: COMPANY_TYPES.find(c => c.key === companyType)?.labelEn || companyType,
      requiredDocs: docs,
      docCount: docs.length,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
