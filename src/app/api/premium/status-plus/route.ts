// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  startTrial, getTrialStatus, convertTrial, hasTrialAccess, hasPremiumOrTrialAccess,
  purchaseGift, redeemGift, listUserGifts,
  createFamilyPlan, joinFamilyPlan, getFamilyPlan, isInFamilyPlan, leaveFamilyPlan,
  FAMILY_PLAN_PRICING, REFERRAL_PROGRAM,
  createReferral, creditReferral, listReferrals,
  getEntitlement,
} from "@/lib/premium-ai-plus";
import { getActiveSubscription, getPremiumFeatures, isPremiumUser, subscribeToPremium, cancelPremium } from "@/lib/premium-ai";
import { logger } from "@/lib/logger";

/**
 * GET /api/premium/status-plus
 * Query params:
 *   ?userId=...                       → full entitlement roll-up
 *   ?userId=...&gifts=1               → user's gifts (sent + received)
 *   ?userId=...&family=1              → user's family plan
 *   ?userId=...&referrals=1           → user's referrals
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    if (sp.get("gifts") === "1") {
      const gifts = await listUserGifts(userId);
      return NextResponse.json({ gifts });
    }
    if (sp.get("family") === "1") {
      const family = await getFamilyPlan(userId);
      return NextResponse.json({ family });
    }
    if (sp.get("referrals") === "1") {
      const referrals = await listReferrals(userId);
      return NextResponse.json({ referrals });
    }
    const entitlement = await getEntitlement(userId);
    const subscription = await getActiveSubscription(userId);
    const features = getPremiumFeatures();
    return NextResponse.json({
      entitlement,
      subscription,
      features,
      familyPlanPricing: FAMILY_PLAN_PRICING,
      referralProgram: REFERRAL_PROGRAM,
    });
  } catch (err) {
    logger.error("[/api/premium/status-plus GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/premium/status-plus
 * Body actions:
 *   { action: 'subscribe', userId, plan }              → real subscription
 *   { action: 'cancel',     userId }
 *   { action: 'startTrial', userId }
 *   { action: 'convertTrial', userId, plan }
 *   { action: 'purchaseGift', senderId, recipientId, months, message? }
 *   { action: 'redeemGift',  code, recipientId }
 *   { action: 'createFamily', ownerId, plan, months? }
 *   { action: 'joinFamily',  inviteCode, userId }
 *   { action: 'leaveFamily', userId }
 *   { action: 'createReferral', referrerId, referredId }
 *   { action: 'creditReferral',  referredId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "subscribe") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const plan = (body.plan as "monthly" | "yearly") || "monthly";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const sub = await subscribeToPremium({ userId, plan });
      return NextResponse.json({ subscription: sub }, { status: 201 });
    }
    if (action === "cancel") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const sub = await cancelPremium(userId);
      return NextResponse.json({ subscription: sub });
    }
    if (action === "startTrial") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const trial = await startTrial(userId);
      return NextResponse.json({ trial }, { status: 201 });
    }
    if (action === "convertTrial") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const plan = (body.plan as "monthly" | "yearly") || "monthly";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const result = await convertTrial(userId, plan);
      return NextResponse.json(result, { status: 201 });
    }
    if (action === "purchaseGift") {
      const senderId = typeof body.senderId === "string" ? body.senderId : "";
      const recipientId = typeof body.recipientId === "string" ? body.recipientId : "";
      const months = typeof body.months === "number" ? body.months : 1;
      const message = typeof body.message === "string" ? body.message : undefined;
      if (!senderId || !recipientId) {
        return NextResponse.json({ error: "senderId + recipientId required" }, { status: 400 });
      }
      const gift = await purchaseGift({ senderId, recipientId, months, message });
      return NextResponse.json({ gift }, { status: 201 });
    }
    if (action === "redeemGift") {
      const code = typeof body.code === "string" ? body.code : "";
      const recipientId = typeof body.recipientId === "string" ? body.recipientId : "";
      if (!code || !recipientId) {
        return NextResponse.json({ error: "code + recipientId required" }, { status: 400 });
      }
      const result = await redeemGift(code, recipientId);
      if (!result.gift) return NextResponse.json({ error: "invalid gift code" }, { status: 404 });
      return NextResponse.json(result, { status: 201 });
    }
    if (action === "createFamily") {
      const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
      const plan = (body.plan as "monthly" | "yearly") || "monthly";
      const months = typeof body.months === "number" ? body.months : 1;
      if (!ownerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });
      const family = await createFamilyPlan({ ownerId, plan, months });
      return NextResponse.json({ family }, { status: 201 });
    }
    if (action === "joinFamily") {
      const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode : "";
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!inviteCode || !userId) {
        return NextResponse.json({ error: "inviteCode + userId required" }, { status: 400 });
      }
      const family = await joinFamilyPlan(inviteCode, userId);
      if (!family) return NextResponse.json({ error: "invalid invite code" }, { status: 404 });
      return NextResponse.json({ family });
    }
    if (action === "leaveFamily") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const ok = await leaveFamilyPlan(userId);
      return NextResponse.json({ left: ok });
    }
    if (action === "createReferral") {
      const referrerId = typeof body.referrerId === "string" ? body.referrerId : "";
      const referredId = typeof body.referredId === "string" ? body.referredId : "";
      if (!referrerId || !referredId) {
        return NextResponse.json({ error: "referrerId + referredId required" }, { status: 400 });
      }
      const ref = await createReferral(referrerId, referredId);
      return NextResponse.json({ referral: ref }, { status: 201 });
    }
    if (action === "creditReferral") {
      const referredId = typeof body.referredId === "string" ? body.referredId : "";
      if (!referredId) return NextResponse.json({ error: "referredId required" }, { status: 400 });
      const result = await creditReferral(referredId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/premium/status-plus POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to mutate" },
      { status: 500 },
    );
  }
}
