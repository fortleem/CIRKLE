import "server-only";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U10 — Agreement NFT (CirkleMint integration)
// When an agreement completes, either party can mint a portable credential
// NFT proving "I completed a [type] agreement for [amount] on [date]". The
// mint is mock — in production this calls CirkleMint's contract layer.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgreementNFT {
  id: string; // NFT token id
  agreementId: string;
  agreementTitle: string;
  type: string; // price | work | service | rental | group_buy
  amount: number;
  currency: string;
  ownerUsername: string;
  counterpartyName: string;
  mintTxHash: string; // mock transaction hash
  blockNumber: number;
  mintedAt: string;
  credential: string; // human-readable credential statement
  metadataUri: string; // mock IPFS-like URI
}

// In-memory ledger of minted NFTs.
const nfts = new Map<string, AgreementNFT>();

let blockCounter = 1_840_000;

const TYPE_CREDENTIAL: Record<string, (title: string, amount: number, currency: string) => string> = {
  price: (t, a, c) => `Completed a purchase agreement — "${t}" — for ${a.toLocaleString()} ${c}`,
  work: (t, a, c) => `Delivered a work-task agreement — "${t}" — valued at ${a.toLocaleString()} ${c}`,
  service: (t, a, c) => `Fulfilled a service agreement — "${t}" — for ${a.toLocaleString()} ${c}`,
  rental: (t, a, c) => `Completed a rental agreement — "${t}" — at ${a.toLocaleString()} ${c}`,
  group_buy: (t, a, c) => `Participated in a group-buy — "${t}" — share ${a.toLocaleString()} ${c}`,
};

export interface MintNFTInput {
  agreementId: string;
  agreementTitle: string;
  type: string;
  amount: number;
  currency: string;
  ownerUsername: string;
  counterpartyName: string;
}

export async function mintAgreementNFT(input: MintNFTInput): Promise<AgreementNFT> {
  // Idempotent: if the owner already minted this agreement, return the
  // existing NFT instead of double-minting.
  const existing = Array.from(nfts.values()).find(
    (n) => n.agreementId === input.agreementId && n.ownerUsername === input.ownerUsername,
  );
  if (existing) return existing;

  const id = `nft-${crypto.randomUUID().slice(0, 12)}`;
  const mintTxHash = `0x${crypto.createHash("sha256").update(`${input.agreementId}:${input.ownerUsername}:${Date.now()}`).digest("hex").slice(0, 64)}`;
  const blockNumber = blockCounter++;
  const mintedAt = new Date().toISOString();
  const credentialFn = TYPE_CREDENTIAL[input.type] ?? TYPE_CREDENTIAL.service;
  const credential = credentialFn(input.agreementTitle, input.amount, input.currency);

  const nft: AgreementNFT = {
    id,
    agreementId: input.agreementId,
    agreementTitle: input.agreementTitle,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    ownerUsername: input.ownerUsername,
    counterpartyName: input.counterpartyName,
    mintTxHash,
    blockNumber,
    mintedAt,
    credential,
    metadataUri: `cirkleipfs://agreement/${input.agreementId}/${id}`,
  };
  nfts.set(id, nft);
  return nft;
}

export async function listNFTs(ownerUsername?: string): Promise<AgreementNFT[]> {
  const all = Array.from(nfts.values());
  const filtered = ownerUsername ? all.filter((n) => n.ownerUsername === ownerUsername) : all;
  return filtered.sort((a, b) => +new Date(b.mintedAt) - +new Date(a.mintedAt));
}

export async function getNFT(id: string): Promise<AgreementNFT | null> {
  return nfts.get(id) ?? null;
}
