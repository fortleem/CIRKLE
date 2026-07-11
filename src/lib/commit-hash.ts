import "server-only";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U9 — On-Chain Agreement Hash (Proof of Existence)
// Uses the built-in `crypto` module — NO new dependencies.
// In production: pin to IPFS or commit to a lightweight L2. For the mock we
// derive a deterministic block ID from the hash itself.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgreementHash {
  hash: string; // SHA-256 hex of agreement content
  timestamp: string; // ISO date
  blockId: string; // mock block ID (in production: IPFS CID or blockchain tx hash)
  verified: boolean;
}

// In-memory ledger of committed hashes keyed by hash → metadata. Lets the
// verify endpoint confirm that a hash was actually "committed" by this server.
const ledger = new Map<string, { timestamp: string; blockId: string }>();

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Commit an agreement's content to the mock on-chain ledger. Idempotent —
 * committing the same content twice returns the same hash + blockId.
 */
export async function commitHash(agreementContent: string): Promise<AgreementHash> {
  const hash = sha256(agreementContent);
  const existing = ledger.get(hash);
  if (existing) {
    return { hash, timestamp: existing.timestamp, blockId: existing.blockId, verified: true };
  }
  const timestamp = new Date().toISOString();
  // Mock block ID: a deterministic prefix + first 16 hex chars of the hash.
  // In production this would be an IPFS CID or a real L2 transaction hash.
  const blockId = `cirkle-block-${hash.slice(0, 16)}`;
  ledger.set(hash, { timestamp, blockId });
  return { hash, timestamp, blockId, verified: true };
}

/**
 * Verify that the supplied content still hashes to the expected value AND
 * that the hash was previously committed to the ledger.
 */
export async function verifyHash(
  agreementContent: string,
  expectedHash: string,
): Promise<boolean> {
  const actualHash = sha256(agreementContent);
  if (actualHash !== expectedHash) return false;
  return ledger.has(expectedHash);
}

/**
 * Look up ledger metadata for a hash without re-hashing. Returns null if the
 * hash was never committed through `commitHash`.
 */
export async function lookupHash(hash: string): Promise<AgreementHash | null> {
  const meta = ledger.get(hash);
  if (!meta) return null;
  return { hash, timestamp: meta.timestamp, blockId: meta.blockId, verified: true };
}

/**
 * Canonical serializer for agreement content — used by both the commit and
 * verify endpoints so the hash is reproducible. Sorts keys + joins parties
 * so a semantically-identical agreement always produces the same hash.
 */
export function canonicalAgreementContent(input: {
  title: string;
  description: string;
  parties: { name: string; signed: boolean }[];
  amount: number;
  currency: string;
  deadline: string;
  conditions: string[];
  hash?: string;
}): string {
  const parties = input.parties
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `${p.name}:${p.signed ? "1" : "0"}`)
    .join("|");
  const conditions = input.conditions.slice().sort().join("|");
  return [
    `title=${input.title}`,
    `desc=${input.description}`,
    `parties=${parties}`,
    `amount=${input.amount}`,
    `currency=${input.currency}`,
    `deadline=${input.deadline}`,
    `conditions=${conditions}`,
  ].join("\n");
}
