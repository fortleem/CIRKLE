// @ts-nocheck
// P1 FIX: Rate-limited (10/min — posts preset) + Zod-validated body.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createProposal,
  getProposals,
  type ProposalStatus,
  type ProposalType,
} from "@/lib/governance-service";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

// ─────────────────────────────────────────────────────────────────────────────
// /api/governance/proposals — GET list proposals, POST create a new one.
//
// GET  /api/governance/proposals?status=voting&type=covenant
// POST /api/governance/proposals  body: { title, description, type, author, closesAt? }
//
// P1 FIX — both handlers wrapped with `withRateLimit` (10 req/min — posts
// preset, anti-spam on proposal creation) and `validateBody` on POST so
// malformed proposals never reach `createProposal`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for `POST /api/governance/proposals`.
 *   - `title` is required (1–200 chars — matches `createProposal` budget).
 *   - `description` is required (1–5000 chars — service slices to 5000).
 *   - `type` is required and must be a known ProposalType
 *     (covenant | treasury | feature | moderation | other).
 *   - `author` is required (1–64 chars — handle or user id).
 *   - `closesAt` is an optional ISO-8601 timestamp.
 */
const proposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  type: z.enum([
    "covenant",
    "treasury",
    "feature",
    "moderation",
    "other",
  ]),
  author: z.string().min(1).max(64),
  closesAt: z
    .string()
    .datetime({ offset: true })
    .optional(),
});

export const GET = withRateLimit(
  async (req: NextRequest) => {
    try {
      const sp = req.nextUrl.searchParams;
      const status = (sp.get("status") || undefined) as ProposalStatus | undefined;
      const type = (sp.get("type") || undefined) as ProposalType | undefined;
      const limitRaw = parseInt(sp.get("limit") || "50", 10);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 50;
      const proposals = await getProposals(status, type, limit);
      return NextResponse.json({ proposals });
    } catch (err) {
      logger.error("[/api/governance/proposals GET] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to load proposals" },
        { status: 500 },
      );
    }
  },
  RATE_LIMIT_PRESETS.posts,
);

export const POST = withRateLimit(
  validateBody(proposalSchema, async (req, body) => {
    try {
      let closesAt: Date | undefined;
      if (body.closesAt) {
        const t = Date.parse(body.closesAt);
        if (Number.isFinite(t)) closesAt = new Date(t);
      }
      const proposal = await createProposal(
        body.title,
        body.description,
        body.type,
        body.author,
        closesAt,
      );
      return NextResponse.json({ ok: true, proposal }, { status: 201 });
    } catch (err) {
      logger.error("[/api/governance/proposals POST] error", {
        error: (err as Error).message,
      });
      const msg = err instanceof Error ? err.message : "failed to create proposal";
      const status = msg.includes("required") || msg.includes("long") ? 400 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
  }),
  RATE_LIMIT_PRESETS.posts,
);
