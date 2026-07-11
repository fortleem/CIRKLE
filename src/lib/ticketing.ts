/**
 * Decentralised Ticketing — Blueprint §26.7.
 *
 * Ed25519-signed offline event tickets. The issuer holds a private key (kept
 * server-side); the public key is published and used to verify tickets
 * offline. Each ticket's `signature` is the Ed25519 signature over the
 * canonical JSON payload (eventName, eventDate, venue, seat, holder, price,
 * currency, issuer) — verifiable by anyone with the public key, no DB lookup
 * required.
 *
 * Backs:
 *   • POST /api/tickets/issue   (issue + sign a ticket)
 *   • POST /api/tickets/verify  (verify a signature against ticket data)
 *   • GET  /api/tickets/my      (list tickets held by a user)
 *
 * Storage: Prisma `EventTicket` (SQLite). The keypair is persisted to
 * `db/ticket-keys.json` so it survives server restarts — without that, all
 * previously-issued tickets would become unverifiable.
 */
import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface EventTicket {
  id: string;
  eventName: string;
  eventDate: string; // ISO
  venue: string;
  seat: string;
  holder: string;
  price: number;
  currency: string;
  signature: string; // hex Ed25519 signature
  issuer: string;
  createdAt: string;
}

export interface IssueTicketInput {
  eventName: string;
  eventDate: string; // ISO
  venue: string;
  seat: string;
  holder: string;
  price: number;
  currency: string;
  issuer: string;
}

// ── Ed25519 keypair persistence ────────────────────────────────────────────

interface KeyPairFile {
  publicKey: string; // DER base64 (SPKI)
  privateKey: string; // DER base64 (PKCS8) — encrypted at rest would be better
                       // but for the dev sandbox we keep it on disk only.
}

const KEY_FILE = path.join(process.cwd(), "db", "ticket-keys.json");

let cached: { public: crypto.KeyObject; private: crypto.KeyObject; publicB64: string } | null = null;

function loadOrCreateKeys(): { public: crypto.KeyObject; private: crypto.KeyObject; publicB64: string } {
  if (cached) return cached;

  // Try loading from disk first.
  try {
    if (fs.existsSync(KEY_FILE)) {
      const raw = fs.readFileSync(KEY_FILE, "utf8");
      const parsed = JSON.parse(raw) as KeyPairFile;
      const pub = crypto.createPublicKey({
        key: Buffer.from(parsed.publicKey, "base64"),
        format: "der",
        type: "spki",
      });
      const priv = crypto.createPrivateKey({
        key: Buffer.from(parsed.privateKey, "base64"),
        format: "der",
        type: "pkcs8",
      });
      cached = { public: pub, private: priv, publicB64: parsed.publicKey };
      return cached;
    }
  } catch (err) {
    logger.warn("[ticketing] failed to read key file — regenerating", {
      error: (err as Error).message,
    });
  }

  // Generate a fresh Ed25519 keypair and persist it.
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubDer = publicKey.export({ format: "der", type: "spki" });
  const privDer = privateKey.export({ format: "der", type: "pkcs8" });
  const file: KeyPairFile = {
    publicKey: pubDer.toString("base64"),
    privateKey: privDer.toString("base64"),
  };
  try {
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
    fs.writeFileSync(KEY_FILE, JSON.stringify(file, null, 2), { mode: 0o600 });
  } catch (err) {
    logger.warn("[ticketing] could not persist keypair", { error: (err as Error).message });
  }
  cached = { public: publicKey, private: privateKey, publicB64: file.publicKey };
  return cached;
}

/** The issuer's Ed25519 public key (SPKI DER, base64). Publish this. */
export function getIssuerPublicKey(): string {
  return loadOrCreateKeys().publicB64;
}

/**
 * Canonical ticket payload — the exact bytes that get signed. Order matters;
 * changing this format invalidates every previously-issued ticket.
 */
function canonicalTicketData(t: {
  eventName: string;
  eventDate: string;
  venue: string;
  seat: string;
  holder: string;
  price: number;
  currency: string;
  issuer: string;
}): string {
  return JSON.stringify({
    eventName: t.eventName,
    eventDate: t.eventDate,
    venue: t.venue,
    seat: t.seat,
    holder: t.holder,
    price: t.price,
    currency: t.currency,
    issuer: t.issuer,
  });
}

/**
 * Issue a signed ticket. The signature is Ed25519 over the canonical payload.
 */
export async function issueTicket(input: IssueTicketInput): Promise<EventTicket> {
  const eventName = input.eventName.trim();
  if (eventName.length < 1 || eventName.length > 120) {
    throw new Error("eventName must be 1–120 characters.");
  }
  const venue = input.venue.trim();
  if (venue.length < 1 || venue.length > 120) {
    throw new Error("venue must be 1–120 characters.");
  }
  const seat = input.seat.trim();
  if (seat.length < 1 || seat.length > 40) {
    throw new Error("seat must be 1–40 characters.");
  }
  const holder = input.holder.trim().toLowerCase().replace(/^@/, "");
  if (!holder) throw new Error("holder is required.");
  const issuer = input.issuer.trim().toLowerCase().replace(/^@/, "");
  if (!issuer) throw new Error("issuer is required.");

  // Parse + validate the event date.
  const eventDateMs = Date.parse(input.eventDate);
  if (isNaN(eventDateMs)) throw new Error("eventDate must be a valid ISO date.");
  const eventDate = new Date(eventDateMs).toISOString();

  const price = Number(input.price);
  if (!isFinite(price) || price < 0) {
    throw new Error("price must be a non-negative number.");
  }
  const currency = (input.currency || "SAR").trim().toUpperCase().slice(0, 8);

  const payload = canonicalTicketData({
    eventName,
    eventDate,
    venue,
    seat,
    holder,
    price,
    currency,
    issuer,
  });

  const { private: priv } = loadOrCreateKeys();
  const signature = crypto.sign(null, Buffer.from(payload, "utf8"), priv);

  const row = await db.eventTicket.create({
    data: {
      eventName,
      eventDate: new Date(eventDate),
      venue,
      seat,
      holder,
      price,
      currency,
      signature: signature.toString("hex"),
      issuer,
    },
  });
  logger.info("[ticketing] issued", { id: row.id, holder, eventName });
  return {
    id: row.id,
    eventName: row.eventName,
    eventDate: row.eventDate.toISOString(),
    venue: row.venue,
    seat: row.seat,
    holder: row.holder,
    price: row.price,
    currency: row.currency,
    signature: row.signature,
    issuer: row.issuer,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Verify a ticket signature against the canonical ticket data. The caller
 * supplies the parsed ticket fields and the hex signature; we re-derive the
 * canonical payload and run Ed25519 verification.
 *
 * Returns `true` if the signature is valid for the supplied data + issuer's
 * public key.
 */
export async function verifyTicket(
  signatureHex: string,
  ticketData: {
    eventName: string;
    eventDate: string;
    venue: string;
    seat: string;
    holder: string;
    price: number;
    currency: string;
    issuer: string;
  },
): Promise<boolean> {
  try {
    const sig = Buffer.from(signatureHex, "hex");
    if (sig.length !== 64) return false; // Ed25519 signatures are 64 bytes
    const payload = Buffer.from(canonicalTicketData(ticketData), "utf8");
    const { public: pub } = loadOrCreateKeys();
    return crypto.verify(null, payload, pub, sig);
  } catch (err) {
    logger.warn("[ticketing] verify failed", { error: (err as Error).message });
    return false;
  }
}

/**
 * List all tickets held by a user (newest first).
 */
export async function listMyTickets(username: string): Promise<EventTicket[]> {
  const holder = username.trim().toLowerCase().replace(/^@/, "");
  if (!holder) return [];
  const rows = await db.eventTicket.findMany({
    where: { holder },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    eventName: r.eventName,
    eventDate: r.eventDate.toISOString(),
    venue: r.venue,
    seat: r.seat,
    holder: r.holder,
    price: r.price,
    currency: r.currency,
    signature: r.signature,
    issuer: r.issuer,
    createdAt: r.createdAt.toISOString(),
  }));
}
