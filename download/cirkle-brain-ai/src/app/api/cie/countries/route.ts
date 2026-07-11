/** GET /api/cie/countries — country intelligence queries. */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { globalCIEEngine } = await import("@/lib/cie");
  const { searchParams } = new URL(req.url);
  const countryCode = searchParams.get("code");

  if (countryCode) {
    const country = globalCIEEngine.countryIntelligence.get(countryCode);
    if (!country) return NextResponse.json({ error: "Country not found", code: countryCode }, { status: 404 });
    return NextResponse.json({ country });
  }

  const countries = globalCIEEngine.countryIntelligence.list();
  return NextResponse.json({
    count: countries.length,
    countries: countries.map((c) => ({
      countryCode: c.countryCode,
      name: c.name,
      languages: c.languages,
      currencies: c.currencies,
      status: c.status,
      availablePacks: c.availableCapabilityPacks.length,
      governmentAgencies: c.governmentAgencies.length,
      paymentRails: c.paymentRails.length,
    })),
  });
}
