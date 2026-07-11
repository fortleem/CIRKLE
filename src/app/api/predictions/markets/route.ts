import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createMarket,
  getMarkets,
  type MarketCategory,
} from "@/lib/prediction-market";

const VALID_CATEGORIES: MarketCategory[] = [
  "news",
  "sports",
  "politics",
  "crypto",
  "travel",
  "weather",
  "visa",
  "social",
];

/**
 * GET /api/predictions/markets
 * Query params:
 *   - category  (filter by category)
 *   - resolved  ("true" | "false")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category") as MarketCategory | null;
    const resolvedParam = searchParams.get("resolved");

    const filter: { category?: MarketCategory; resolved?: boolean } = {};
    if (categoryParam && VALID_CATEGORIES.includes(categoryParam)) {
      filter.category = categoryParam;
    }
    if (resolvedParam === "true") filter.resolved = true;
    if (resolvedParam === "false") filter.resolved = false;

    const markets = await getMarkets(filter);
    return NextResponse.json({ markets });
  } catch (err) {
    logger.error("[/api/predictions/markets] GET error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list markets" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/predictions/markets
 * Body: { question, category, resolutionDate, outcomes[], createdBy, liquidityParam? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      question?: string;
      category?: MarketCategory;
      resolutionDate?: string;
      outcomes?: { id?: string; label?: string }[];
      createdBy?: string;
      liquidityParam?: number;
    } | null;

    if (!body?.question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!body.resolutionDate) {
      return NextResponse.json({ error: "resolutionDate is required" }, { status: 400 });
    }
    if (!Array.isArray(body.outcomes) || body.outcomes.length < 2) {
      return NextResponse.json(
        { error: "at least 2 outcomes are required" },
        { status: 400 },
      );
    }

    const market = await createMarket({
      question: body.question,
      category: body.category,
      resolutionDate: body.resolutionDate,
      outcomes: body.outcomes.map((o) => ({
        id: o.id ?? o.label ?? "",
        label: o.label ?? o.id ?? "",
      })),
      createdBy: body.createdBy ?? "anonymous",
      liquidityParam: body.liquidityParam,
    });

    return NextResponse.json({ market }, { status: 201 });
  } catch (err) {
    logger.error("[/api/predictions/markets] POST error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create market" },
      { status: 500 },
    );
  }
}
