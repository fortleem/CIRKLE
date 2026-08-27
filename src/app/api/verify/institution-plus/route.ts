// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  recordPayment,
  refundPayment,
  getPaymentLedger,
  renewVerification,
  upgradeTier,
  issueCertificate,
  getCertificate,
  revokeCertificate,
  getRevenueRollup,
  renewalFee,
  upgradeFee,
} from "@/lib/verified-badge-plus";
import { getVerificationStatus, type BadgeTier } from "@/lib/verified-badge";
import { logger } from "@/lib/logger";

/**
 * GET /api/verify/institution-plus
 * Query params:
 *   ?institutionId=...      → returns verification + payment ledger + certificate
 *   ?revenue=1              → returns the revenue roll-up (admin)
 *   ?id=...&action=certificate  → returns the certificate for a verification id
 */
export async function GET(req: NextRequest) {
  try {
    const institutionId = req.nextUrl.searchParams.get("institutionId") || "";
    const revenueFlag = req.nextUrl.searchParams.get("revenue") === "1";
    const action = req.nextUrl.searchParams.get("action") || "";
    const id = req.nextUrl.searchParams.get("id") || "";

    if (revenueFlag) {
      const rollup = await getRevenueRollup();
      return NextResponse.json({ revenue: rollup });
    }
    if (action === "certificate" && id) {
      const cert = await getCertificate(id);
      return NextResponse.json({ certificate: cert });
    }
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
    }
    const verification = await getVerificationStatus(institutionId);
    const ledger = await getPaymentLedger(institutionId);
    const certificate = verification ? await getCertificate(verification.id) : null;
    return NextResponse.json({ verification, ledger, certificate });
  } catch (err) {
    logger.error("[/api/verify/institution-plus GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/verify/institution-plus
 * Body:
 *   { action: 'renew',    verificationId, method? }
 *   { action: 'upgrade',  verificationId, newTier, method? }
 *   { action: 'issueCertificate', verificationId }
 *   { action: 'revokeCertificate', certId }
 *   { action: 'recordPayment', verificationId, institutionId, kind, tier, amount, method?, reference? }
 *   { action: 'refund',    paymentId }
 *   { action: 'pricing',   tier? }   → returns fee schedule
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "pricing") {
      const tiers: BadgeTier[] = ["basic", "silver", "gold"];
      const schedule = tiers.map((t) => ({
        tier: t,
        initialFee:
          t === "basic" ? 49 : t === "silver" ? 199 : 499,
        renewalFee: renewalFee(t),
        upgradeFees: {
          fromBasic: upgradeFee("basic", t),
          fromSilver: upgradeFee("silver", t),
          fromGold: 0,
        },
      }));
      return NextResponse.json({ schedule });
    }

    if (action === "renew") {
      const vid = typeof body.verificationId === "string" ? body.verificationId : "";
      if (!vid) return NextResponse.json({ error: "verificationId required" }, { status: 400 });
      const method = (body.method as "card" | "wallet" | "bank_transfer") || "card";
      const result = await renewVerification(vid, method);
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "upgrade") {
      const vid = typeof body.verificationId === "string" ? body.verificationId : "";
      const newTier = (body.newTier as BadgeTier) || "basic";
      if (!vid) return NextResponse.json({ error: "verificationId required" }, { status: 400 });
      const method = (body.method as "card" | "wallet" | "bank_transfer") || "card";
      const result = await upgradeTier(vid, newTier, method);
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "issueCertificate") {
      const vid = typeof body.verificationId === "string" ? body.verificationId : "";
      if (!vid) return NextResponse.json({ error: "verificationId required" }, { status: 400 });
      const cert = await issueCertificate(vid);
      if (!cert) return NextResponse.json({ error: "verification not approved" }, { status: 400 });
      return NextResponse.json({ certificate: cert }, { status: 201 });
    }

    if (action === "revokeCertificate") {
      const cid = typeof body.certId === "string" ? body.certId : "";
      if (!cid) return NextResponse.json({ error: "certId required" }, { status: 400 });
      const cert = await revokeCertificate(cid);
      return NextResponse.json({ certificate: cert });
    }

    if (action === "recordPayment") {
      const vid = typeof body.verificationId === "string" ? body.verificationId : "";
      const iid = typeof body.institutionId === "string" ? body.institutionId : "";
      const kind = (body.kind as "initial" | "renewal" | "upgrade") || "initial";
      const tier = (body.tier as BadgeTier) || "basic";
      const amount = typeof body.amount === "number" ? body.amount : 0;
      const method = (body.method as "card" | "wallet" | "bank_transfer") || "card";
      const reference = typeof body.reference === "string" ? body.reference : undefined;
      if (!vid || !iid) {
        return NextResponse.json({ error: "verificationId + institutionId required" }, { status: 400 });
      }
      const payment = await recordPayment({
        verificationId: vid,
        institutionId: iid,
        kind,
        tier,
        amount,
        method,
        reference,
      });
      return NextResponse.json({ payment }, { status: 201 });
    }

    if (action === "refund") {
      const pid = typeof body.paymentId === "string" ? body.paymentId : "";
      if (!pid) return NextResponse.json({ error: "paymentId required" }, { status: 400 });
      const payment = await refundPayment(pid);
      return NextResponse.json({ payment });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/verify/institution-plus POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to mutate" },
      { status: 500 },
    );
  }
}
