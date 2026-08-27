// @ts-nocheck
/**
 * Commit Escrow Fees (D5).
 *
 * Cirkle Commit holds funds in escrow until both parties confirm delivery.
 * The platform takes a 1% fee on the escrowed amount.
 *
 * Pure calculation library — no storage needed.
 */
import "server-only";

export const ESCROW_FEE_RATE = 0.01; // 1%
export const ESCROW_FEE_MIN = 0.5; // minimum $0.50
export const ESCROW_FEE_MAX = 500; // maximum $500

export interface EscrowFeeResult {
  amount: number;
  fee: number;
  netToRecipient: number;
  currency: string;
  rate: number;
}

export function calculateEscrowFee(
  amount: number,
  currency = "USD",
): EscrowFeeResult {
  if (!isFinite(amount) || amount < 0) {
    throw new Error("amount must be a non-negative number");
  }
  if (amount > 10_000_000) {
    throw new Error("amount exceeds the per-escrow cap of 10,000,000");
  }
  const rawFee = amount * ESCROW_FEE_RATE;
  const fee = Math.round(Math.min(Math.max(rawFee, ESCROW_FEE_MIN), ESCROW_FEE_MAX) * 100) / 100;
  const netToRecipient = Math.round((amount - fee) * 100) / 100;
  return {
    amount: Math.round(amount * 100) / 100,
    fee,
    netToRecipient,
    currency: (currency || "USD").toUpperCase().slice(0, 3),
    rate: ESCROW_FEE_RATE,
  };
}

export interface ProcessEscrowInput {
  amount: number;
  currency?: string;
  fromUser: string;
  toUser: string;
  commitId: string;
}

export interface ProcessEscrowResult extends EscrowFeeResult {
  status: "held" | "released" | "refunded";
  escrowId: string;
  commitId: string;
  fromUser: string;
  toUser: string;
  createdAt: string;
}

/** Hold funds in escrow. Sandbox: returns immediately with status=held. */
export async function processEscrowPayment(
  input: ProcessEscrowInput,
): Promise<ProcessEscrowResult> {
  const calc = calculateEscrowFee(input.amount, input.currency);
  const fromUser = (input.fromUser || "").trim().toLowerCase().replace(/^@/, "");
  const toUser = (input.toUser || "").trim().toLowerCase().replace(/^@/, "");
  if (!fromUser) throw new Error("fromUser is required");
  if (!toUser) throw new Error("toUser is required");
  if (!input.commitId) throw new Error("commitId is required");
  return {
    ...calc,
    status: "held",
    escrowId: `esc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    commitId: input.commitId,
    fromUser,
    toUser,
    createdAt: new Date().toISOString(),
  };
}
