import { NextRequest, NextResponse } from "next/server";
import { listNFTs, mintAgreementNFT } from "@/lib/commit-nft";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U10 — Agreement NFT (CirkleMint integration)
//   POST → mint a completed agreement as an NFT credential via CirkleMint
//   GET  → list minted NFTs (optional ?owner=... filter)
// The NFT proves: "This person completed a [type] agreement for [amount] on
// [date]". Mint is mock — returns an NFT ID + mock transaction hash.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      agreementId,
      agreementTitle,
      type = "service",
      amount = 0,
      currency = "SAR",
      ownerUsername = "you",
      counterpartyName = "Counterparty",
    } = body as Record<string, unknown>;

    if (typeof agreementId !== "string" || !agreementId.trim()) {
      return NextResponse.json({ error: "agreementId is required" }, { status: 400 });
    }
    if (typeof agreementTitle !== "string" || !agreementTitle.trim()) {
      return NextResponse.json({ error: "agreementTitle is required" }, { status: 400 });
    }

    const nft = await mintAgreementNFT({
      agreementId,
      agreementTitle,
      type: typeof type === "string" ? type : "service",
      amount: typeof amount === "number" && amount >= 0 ? amount : 0,
      currency: typeof currency === "string" ? currency : "SAR",
      ownerUsername: typeof ownerUsername === "string" && ownerUsername.trim() ? ownerUsername : "you",
      counterpartyName: typeof counterpartyName === "string" && counterpartyName.trim() ? counterpartyName : "Counterparty",
    });

    return NextResponse.json(
      {
        ok: true,
        nft,
        message: `Minted NFT credential #${nft.id}`,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json({ error: "Failed to mint NFT", details: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const owner = url.searchParams.get("owner") || undefined;
    const nfts = await listNFTs(owner);
    return NextResponse.json({ nfts, count: nfts.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed to list NFTs", details: String(err) }, { status: 500 });
  }
}
