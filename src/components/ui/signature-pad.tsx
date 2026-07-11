"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SignaturePad (U6) — Canvas-based verified digital signature.
//
// Renders a modal layered on top of its parent overlay. The user draws their
// signature with finger / mouse / pen, then clicks "Sign" to capture the
// signature as a base64 PNG. Closes by callback — never manages its own
// open state so the parent retains full control.
//
// Brand palette only (gold / teal / charcoal / cream). NO indigo / blue.
// ─────────────────────────────────────────────────────────────────────────────

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  PenTool,
  ShieldCheck,
  UserCheck,
  X,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SignatureAttestations {
  over_18: boolean;
  unique_human: boolean;
}

export interface SignaturePadProps {
  open: boolean;
  /** Cirkle username (without the @) — shown as "@username · Verified by Cirkle ID". */
  username: string;
  /** Optional display name shown below the signature line. */
  displayName?: string;
  /** Attestation flags from Cirkle ID — drive the verification badges. */
  attestations: SignatureAttestations;
  /** Called when the user clicks "Sign". Receives the base64 PNG data URL. */
  onSign: (dataUrl: string) => void | Promise<void>;
  /** Called when the user dismisses the pad (X / Cancel / backdrop). */
  onClose: () => void;
  /** Disable the Sign button + show a spinner while the parent persists. */
  signing?: boolean;
  /** Optional title shown at the top of the pad. */
  title?: string;
}

interface Point {
  x: number;
  y: number;
}

const INK_COLOR = "#1A1A14"; // charcoal — works in light + dark
const INK_WIDTH = 2.5;

export function SignaturePad({
  open,
  username,
  displayName,
  attestations,
  onSign,
  onClose,
  signing = false,
  title = "Sign the agreement",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  // ── Canvas setup: high-DPI scaling so strokes stay crisp on retina. ──
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = INK_WIDTH;
    ctx.strokeStyle = INK_COLOR;
  }, []);

  // Re-size the canvas whenever the pad opens (the modal animates in first).
  // State resets + canvas setup are deferred to a microtask so we don't
  // trigger React's "setState in effect body" cascading-render guard.
  useEffect(() => {
    if (!open) return;
    const resetAndSetup = () => {
      setCaptured(null);
      setHasInk(false);
      hasInkRef.current = false;
      setupCanvas();
    };
    const t = window.setTimeout(resetAndSetup, 0);
    const t2 = window.setTimeout(setupCanvas, 320);
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResize);
    };
  }, [open, setupCanvas]);

  // ── Drawing handlers (pointer events cover mouse + touch + pen). ──
  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    canvas?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = pointFromEvent(e);
    lastPointRef.current = p;
    // Draw a tiny dot so single taps register.
    ctx.beginPath();
    ctx.arc(p.x, p.y, INK_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = INK_COLOR;
    ctx.fill();
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pointFromEvent(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasInkRef.current = false;
    setHasInk(false);
    setCaptured(null);
  };

  const handleSign = async () => {
    if (!hasInk || signing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Composite onto a cream background so the PNG is readable on any theme.
    const rect = canvas.getBoundingClientRect();
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(rect.width));
    out.height = Math.max(1, Math.round(rect.height));
    const octx = out.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#FDFCF9"; // cream
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0, out.width, out.height);
    const dataUrl = out.toDataURL("image/png");
    setCaptured(dataUrl);
    try {
      await onSign(dataUrl);
    } catch {
      /* parent surfaces errors via toast */
    }
  };

  // ── Verification badge helpers ──
  const verifiedHuman = attestations.unique_human;
  const over18 = attestations.over_18;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[180] bg-charcoal/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-strong rounded-2xl border border-border/60 shadow-float p-4 sm:p-5"
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/15 border border-secondary/30 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base leading-tight">{title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Draw your signature with your finger or mouse. Your Cirkle ID verification is attached automatically.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={signing}
                aria-label="Close signature pad"
                className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Identity + verification strip */}
            <div className="mt-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-primary/30 flex items-center justify-center text-[9px]">
                    {username.slice(0, 2).toUpperCase()}
                  </span>
                  Signing as <span className="text-secondary">@{username}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  · Verified by Cirkle ID
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <VerifiedBadge icon={UserCheck} label="unique_human" verified={verifiedHuman} />
                  <VerifiedBadge icon={ShieldCheck} label="over_18" verified={over18} />
                </div>
              </div>
              {displayName ? (
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  {displayName} · Cirkle ID attested
                </div>
              ) : null}
            </div>

            {/* Canvas */}
            <div className="mt-3 relative">
              <div className="rounded-xl border border-border/60 bg-cream overflow-hidden relative">
                {/* Signature baseline */}
                <div className="pointer-events-none absolute left-4 right-4 bottom-8 border-b border-dashed border-foreground/20" />
                <div className="pointer-events-none absolute left-4 bottom-2 text-[9px] text-muted-foreground uppercase tracking-widest">
                  Signature
                </div>
                <div className="pointer-events-none absolute right-4 bottom-2 text-[9px] text-muted-foreground uppercase tracking-widest">
                  ×
                </div>
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerCancel={endDraw}
                  onPointerLeave={endDraw}
                  className="block w-full h-44 sm:h-48 touch-none cursor-crosshair"
                  aria-label="Signature drawing surface"
                />
                {!hasInk && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                    Sign here
                  </div>
                )}
              </div>
            </div>

            {/* Captured preview */}
            {captured ? (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                <div className="flex items-center gap-2 text-[10px] text-emerald-700 dark:text-emerald-400 mb-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  Signature captured — verifying…
                </div>
                <div className="rounded-md overflow-hidden border border-border/60 bg-cream">
                  <img src={captured} alt="Captured signature preview" className="block w-full h-16 object-contain" />
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={clear}
                disabled={!hasInk || signing}
                className="px-3 py-2.5 rounded-xl bg-card border border-border/60 text-xs font-medium flex items-center gap-1.5 hover:bg-muted/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eraser className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={handleSign}
                disabled={!hasInk || signing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-gold text-charcoal text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
              >
                {signing ? (
                  <>
                    <Hourglass className="w-4 h-4 animate-pulse" /> Signing…
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" /> Sign &amp; verify
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              {verifiedHuman
                ? "✅ Verified human · Your signature is cryptographically bound to your Cirkle ID."
                : "Bound to your Cirkle ID. Get unique_human attestation to upgrade to fully verified."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Small inline verified badge ────────────────────────────────────────────
function VerifiedBadge({
  icon: Icon,
  label,
  verified,
}: {
  icon: LucideIcon;
  label: string;
  verified: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border",
        verified
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
          : "bg-muted text-muted-foreground border-border/60",
      )}
      title={verified ? `${label} verified` : `${label} not verified`}
    >
      <Icon className="w-3 h-3" />
      {verified ? "✓" : "—"} {label}
    </span>
  );
}
