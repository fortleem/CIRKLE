// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  setDecoyPasscode, getDecoyPasscode, verifyDecoyPasscode, toggleDecoyPasscode,
  addHiddenConversation, removeHiddenConversation,
  getLockoutPolicy, recordFailedAttempt, resetLockoutPolicy, isLockedOut, MAX_ATTEMPTS,
  logIntrusion, listIntrusions, clearIntrusionLog,
  getPanicGestureConfig, updatePanicGestureConfig, triggerPanic,
  getEnhancedSettings,
} from "@/lib/app-lock-plus";
import { logger } from "@/lib/logger";

/**
 * GET /api/app-lock-plus
 *   ?userId=...                     → enhanced settings roll-up
 *   ?userId=...&intrusions=1        → recent intrusion log
 *   ?userId=...&lockout=1           → just the lockout policy
 *   ?userId=...&panic=1             → just the panic config
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    if (sp.get("intrusions") === "1") {
      const intrusions = await listIntrusions(userId, 50);
      return NextResponse.json({ intrusions });
    }
    if (sp.get("lockout") === "1") {
      const lockout = await getLockoutPolicy(userId);
      const status = await isLockedOut(userId);
      return NextResponse.json({ lockout, status });
    }
    if (sp.get("panic") === "1") {
      const panic = await getPanicGestureConfig(userId);
      return NextResponse.json({ panic });
    }
    const settings = await getEnhancedSettings(userId);
    return NextResponse.json(settings);
  } catch (err) {
    logger.error("[/api/app-lock-plus GET]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/app-lock-plus
 *   { action: 'setDecoy',           userId, passcode }
 *   { action: 'toggleDecoy',        userId, enabled }
 *   { action: 'verifyDecoy',        userId, passcode }
 *   { action: 'addHiddenConv',      userId, conversationId }
 *   { action: 'removeHiddenConv',   userId, conversationId }
 *   { action: 'recordFailedAttempt', userId }
 *   { action: 'resetLockout',       userId }
 *   { action: 'updatePanicConfig', userId, enabled?, tapsRequired?, windowMs?, action? }
 *   { action: 'triggerPanic',       userId }
 *   { action: 'clearIntrusions',    userId }
 *   { action: 'logIntrusion',       userId, attemptType, success, reason? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "setDecoy") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const passcode = typeof body.passcode === "string" ? body.passcode : "";
      if (!userId || !passcode) return NextResponse.json({ error: "userId + passcode required" }, { status: 400 });
      const rec = await setDecoyPasscode(userId, passcode);
      return NextResponse.json({ decoy: rec }, { status: 201 });
    }
    if (action === "toggleDecoy") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const enabled = !!body.enabled;
      const rec = await toggleDecoyPasscode(userId, enabled);
      return NextResponse.json({ decoy: rec });
    }
    if (action === "verifyDecoy") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const passcode = typeof body.passcode === "string" ? body.passcode : "";
      if (!userId || !passcode) return NextResponse.json({ error: "userId + passcode required" }, { status: 400 });
      const ok = await verifyDecoyPasscode(userId, passcode);
      return NextResponse.json({ verified: ok });
    }
    if (action === "addHiddenConv") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
      if (!userId || !conversationId) return NextResponse.json({ error: "userId + conversationId required" }, { status: 400 });
      const rec = await addHiddenConversation(userId, conversationId);
      return NextResponse.json({ decoy: rec });
    }
    if (action === "removeHiddenConv") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
      if (!userId || !conversationId) return NextResponse.json({ error: "userId + conversationId required" }, { status: 400 });
      const rec = await removeHiddenConversation(userId, conversationId);
      return NextResponse.json({ decoy: rec });
    }
    if (action === "recordFailedAttempt") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const policy = await recordFailedAttempt(userId);
      const status = await isLockedOut(userId);
      return NextResponse.json({ policy, status, maxAttempts: MAX_ATTEMPTS });
    }
    if (action === "resetLockout") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const policy = await resetLockoutPolicy(userId);
      return NextResponse.json({ policy });
    }
    if (action === "updatePanicConfig") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const patch: Record<string, unknown> = {};
      if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
      if (typeof body.tapsRequired === "number") patch.tapsRequired = body.tapsRequired;
      if (typeof body.windowMs === "number") patch.windowMs = body.windowMs;
      if (typeof body.action === "string" && ["lock", "lock_and_wipe", "lock_and_decoy"].includes(body.action)) {
        patch.action = body.action;
      }
      const cfg = await updatePanicGestureConfig(userId, patch);
      return NextResponse.json({ panic: cfg });
    }
    if (action === "triggerPanic") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const result = await triggerPanic(userId);
      return NextResponse.json(result, { status: 201 });
    }
    if (action === "clearIntrusions") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const count = await clearIntrusionLog(userId);
      return NextResponse.json({ cleared: count });
    }
    if (action === "logIntrusion") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const attemptType = (body.attemptType as "passcode" | "biometric" | "panic") || "passcode";
      const success = !!body.success;
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const event = await logIntrusion(userId, attemptType, success, reason ? { reason } : undefined);
      return NextResponse.json({ event }, { status: 201 });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/app-lock-plus POST]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to mutate" }, { status: 500 });
  }
}
