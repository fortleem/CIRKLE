/**
 * GET /api/monitoring/errors
 * DELETE /api/monitoring/errors
 * ============================================================================
 * Lightweight admin endpoint for inspecting the in-memory error buffer
 * populated by `src/lib/error-monitoring.ts`.
 *
 * - GET    → returns `{ stats, errors: [...] }` (newest 100, newest last).
 * - DELETE → wipes the buffer (used by the admin dashboard's "clear" button).
 *
 * NOTE: this endpoint is intentionally NOT auth-gated because CIRKLE's auth
 * is client-side only. In production, the reverse proxy (Caddy / Cloudflare
 * Access) should restrict `/api/monitoring/*` to admin networks. The
 * endpoint never returns secrets — only error messages + stack traces,
 * which are safe to surface to operators.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  getErrorHistory,
  getErrorStats,
  clearErrorHistory,
  captureMessage,
} from "@/lib/error-monitoring";

export async function GET() {
  try {
    const errors = getErrorHistory();
    const stats = getErrorStats();
    return NextResponse.json(
      { stats, errors, count: errors.length },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed to read error history", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    clearErrorHistory();
    captureMessage("error history cleared via /api/monitoring/errors DELETE", "info");
    return NextResponse.json({ ok: true, cleared: true });
  } catch (err) {
    return NextResponse.json(
      { error: "failed to clear error history", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
