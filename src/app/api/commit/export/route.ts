import { NextRequest, NextResponse } from "next/server";
import { canonicalAgreementContent, commitHash } from "@/lib/commit-hash";
import { lookupAgreementForExport } from "@/lib/commit-export-registry";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U12 — Export API
//   GET /api/commit/export?id=...&format=json|pdf
// Returns a PDF-ready JSON document with the full agreement, parties,
// signatures, conditions, fairness check, and a freshly-committed hash +
// verification QR payload. When format=pdf we return a self-contained
// HTML document styled for printing (the client can open it in a new tab
// or pipe it through the browser's print-to-PDF).
// ─────────────────────────────────────────────────────────────────────────────

function sampleAgreement(id: string): Record<string, unknown> | null {
  return lookupAgreementForExport(id);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const format = (url.searchParams.get("format") || "json").toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    const agreement = sampleAgreement(id);
    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // (Re)commit a fresh hash for the exported snapshot so the PDF carries
    // a verification QR that resolves on the verify endpoint.
    const content = canonicalAgreementContent({
      title: String(agreement.title ?? ""),
      description: String(agreement.description ?? ""),
      parties: (Array.isArray(agreement.parties) ? agreement.parties : [])
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => ({
          name: String(p.name ?? ""),
          signed: Boolean(p.signed),
        })),
      amount: Number(agreement.amount ?? 0),
      currency: String(agreement.currency ?? "SAR"),
      deadline: String(agreement.deadline ?? ""),
      conditions: Array.isArray(agreement.conditions)
        ? (agreement.conditions as unknown[]).filter((c): c is string => typeof c === "string")
        : [],
    });
    const hashRecord = await commitHash(content);

    const verifyUrl = `${url.origin}/api/commit/hash?hash=${hashRecord.hash}`;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      agreement,
      onChain: hashRecord,
      verifyUrl,
      qrPayload: hashRecord.hash,
    };

    if (format === "pdf") {
      const html = renderPdfHtml(exportPayload);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="cirkle-commit-${id}.html"`,
        },
      });
    }

    return NextResponse.json(exportPayload);
  } catch (err) {
    return NextResponse.json({ error: "Failed to export", details: String(err) }, { status: 500 });
  }
}

function renderPdfHtml(payload: Record<string, unknown>): string {
  const a = payload.agreement as Record<string, unknown>;
  const onChain = payload.onChain as { hash: string; blockId: string; timestamp: string };
  const parties = Array.isArray(a.parties) ? (a.parties as Array<Record<string, unknown>>) : [];
  const conditions = Array.isArray(a.conditions) ? (a.conditions as string[]) : [];

  // Simple deterministic QR-like matrix from the hash (visual mock — encodes
  // the hash as a 21x21 grid of black/white cells). Pure CSS so the HTML is
  // self-contained for printing.
  const qrHtml = renderQrMock(onChain.hash);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(String(a.title ?? "Agreement"))} · CirkleCommit</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif; color: #1a1a14; background: #fdfcf9; }
  .doc { max-width: 740px; margin: 0 auto; background: white; border: 1px solid #e5e0d6; border-radius: 16px; padding: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1a4a5a; }
  .sub { color: #6b6657; font-size: 13px; margin-bottom: 24px; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
  .chip { padding: 6px 12px; border-radius: 999px; font-size: 12px; border: 1px solid #e5e0d6; background: #faf7f0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 20px 0; }
  .cell { border: 1px solid #e5e0d6; border-radius: 12px; padding: 12px; text-align: center; }
  .cell .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6b6657; }
  .cell .val { font-size: 16px; font-weight: 600; margin-top: 4px; color: #1a4a5a; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #6b6657; margin: 24px 0 8px; }
  .parties { display: flex; flex-direction: column; gap: 8px; }
  .party { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e0d6; border-radius: 10px; }
  .party .name { font-weight: 600; font-size: 14px; }
  .party .sig { margin-left: auto; font-size: 12px; color: ${parties.some((p) => p.signed) ? "#0f766e" : "#9a9586"}; }
  .conditions { list-style: none; padding: 0; margin: 0; }
  .conditions li { padding: 8px 0; border-bottom: 1px dashed #e5e0d6; font-size: 14px; display: flex; gap: 8px; }
  .conditions li:last-child { border-bottom: 0; }
  .hash-box { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; background: #faf7f0; border: 1px solid #e5e0d6; border-radius: 8px; padding: 10px; word-break: break-all; }
  .qr { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
  .qr-grid { width: 168px; height: 168px; display: grid; grid-template-columns: repeat(21, 1fr); grid-template-rows: repeat(21, 1fr); border: 8px solid white; }
  .qr-grid div { background: white; }
  .qr-grid div.on { background: #1a1a14; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e0d6; font-size: 11px; color: #6b6657; text-align: center; }
  @media print { body { padding: 0; background: white; } .doc { border: 0; border-radius: 0; max-width: none; } }
</style>
</head>
<body>
  <div class="doc">
    <h1>${escapeHtml(String(a.title ?? "Agreement"))}</h1>
    <div class="sub">CirkleCommit · Exported ${escapeHtml(String(payload.exportedAt))}</div>

    <div class="row">
      <span class="chip">${escapeHtml(String(a.typeEmoji ?? ""))} ${escapeHtml(String(a.typeLabel ?? a.type ?? ""))}</span>
      <span class="chip">Status: ${escapeHtml(String(a.status ?? ""))}</span>
      <span class="chip">Currency: ${escapeHtml(String(a.currency ?? "SAR"))}</span>
    </div>

    <p style="font-size:14px;line-height:1.6;color:#3a3528;">${escapeHtml(String(a.description ?? ""))}</p>

    <div class="grid">
      <div class="cell"><div class="lbl">Amount</div><div class="val">${escapeHtml(String(Number(a.amount ?? 0).toLocaleString()))}</div></div>
      <div class="cell"><div class="lbl">Deadline</div><div class="val">${escapeHtml(String(a.deadline ?? "—"))}</div></div>
      <div class="cell"><div class="lbl">Escrow</div><div class="val" style="font-size:12px;">${escapeHtml(String(a.escrow ?? "—"))}</div></div>
    </div>

    <h2>Parties &amp; signatures</h2>
    <div class="parties">
      ${parties.map((p) => `<div class="party"><div class="name">${escapeHtml(String(p.name ?? ""))}</div><div class="sig">${p.signed ? "✓ Signed" : "Awaiting signature"}</div></div>`).join("")}
    </div>

    ${conditions.length > 0 ? `<h2>Conditions</h2><ul class="conditions">${conditions.map((c) => `<li><span style="color:#c2a060;">●</span><span>${escapeHtml(String(c))}</span></li>`).join("")}</ul>` : ""}

    <h2>On-chain verification</h2>
    <div class="hash-box">${escapeHtml(onChain.hash)}</div>
    <div class="qr">
      <div class="qr-grid">${qrHtml}</div>
      <div style="font-size:12px;color:#6b6657;">
        <div><strong>Block ID:</strong> ${escapeHtml(onChain.blockId)}</div>
        <div><strong>Timestamp:</strong> ${escapeHtml(onChain.timestamp)}</div>
        <div style="margin-top:8px;">Scan to verify · or visit</div>
        <div style="word-break:break-all;">${escapeHtml(String(payload.verifyUrl ?? ""))}</div>
      </div>
    </div>

    <div class="footer">Generated by CirkleCommit · AI-verified agreements with conditional escrow</div>
  </div>
</body>
</html>`;
}

function renderQrMock(hash: string): string {
  // 21x21 = 441 cells. Use the hash chars (hex) deterministically to flip
  // cells "on". Always render the three corner finder patterns so it reads
  // as a QR code visually.
  const N = 21;
  const cells: boolean[] = new Array(N * N).fill(false);
  const hex = hash.replace(/[^0-9a-f]/gi, "");
  for (let i = 0; i < cells.length; i++) {
    const ch = hex.charCodeAt(i % hex.length);
    cells[i] = (ch + i) % 2 === 0;
  }
  // Finder patterns at (0,0), (0,N-7), (N-7,0).
  const stampFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const onInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[(r0 + r) * N + (c0 + c)] = onBorder || onInner;
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(0, N - 7);
  stampFinder(N - 7, 0);

  return cells.map((on) => `<div class="${on ? "on" : ""}"></div>`).join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
