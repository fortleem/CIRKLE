"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Ticket as TicketIcon, Loader2, QrCode, ShieldCheck, ShieldAlert,
  Plus, Calendar, MapPin, Armchair, DollarSign, Download, Copy, Check,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Ticket {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  seat: string;
  holder: string;
  price: number;
  currency: string;
  signature: string;
  issuer: string;
  createdAt: string;
}

type Tab = "wallet" | "verify" | "issue";

export function TicketMint({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";

  const [tab, setTab] = useState<Tab>("wallet");

  // Wallet
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuerPublicKey, setIssuerPublicKey] = useState<string>("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState(false);

  // Verify
  const [verifySig, setVerifySig] = useState("");
  const [verifyJson, setVerifyJson] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<null | { valid: boolean }>(null);

  // Issue
  const [form, setForm] = useState({
    eventName: "",
    eventDate: "",
    venue: "",
    seat: "",
    holder: "",
    price: "0",
    currency: "SAR",
  });
  const [issuing, setIssuing] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/my?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { tickets: Ticket[]; issuerPublicKey: string };
      setTickets(data.tickets);
      setIssuerPublicKey(data.issuerPublicKey);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (open) fetchTickets();
  }, [open, fetchTickets]);

  // QR code URL — uses the same public QR-rendering service as ContactQR so
  // the wallet can show a scannable ticket without bundling a QR library.
  const qrUrl = (data: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1a1a15&margin=10`;

  // The signed ticket payload (canonical form) — this is what a scanner
  // posts back to /api/tickets/verify.
  const ticketQrData = (t: Ticket): string =>
    JSON.stringify({
      ticket: {
        eventName: t.eventName,
        eventDate: t.eventDate,
        venue: t.venue,
        seat: t.seat,
        holder: t.holder,
        price: t.price,
        currency: t.currency,
        issuer: t.issuer,
      },
      signature: t.signature,
    });

  const handleIssue = async () => {
    if (form.eventName.trim().length < 1) { toast.error("Event name is required"); return; }
    if (form.venue.trim().length < 1) { toast.error("Venue is required"); return; }
    if (form.seat.trim().length < 1) { toast.error("Seat is required"); return; }
    if (form.holder.trim().length < 1) { toast.error("Holder is required"); return; }
    if (!form.eventDate) { toast.error("Event date is required"); return; }
    setIssuing(true);
    try {
      const res = await fetch("/api/tickets/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price) || 0,
          issuer: username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue ticket");
      toast.success("Ticket issued + signed");
      setForm({
        eventName: "", eventDate: "", venue: "", seat: "",
        holder: "", price: "0", currency: "SAR",
      });
      await fetchTickets();
      setTab("wallet");
      setSelected(data.ticket as Ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue ticket");
    } finally {
      setIssuing(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      let parsed: { ticket: Record<string, unknown>; signature: string };
      try {
        parsed = JSON.parse(verifyJson);
      } catch {
        // Maybe the user pasted just the signature in the JSON box.
        throw new Error("Invalid JSON — paste the full ticket payload.");
      }
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: verifySig || (typeof parsed.signature === "string" ? parsed.signature : ""),
          ticket: parsed.ticket,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerifyResult({ valid: !!data.valid });
      if (data.valid) toast.success("Ticket signature is VALID");
      else toast.error("Ticket signature is INVALID");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setVerifyResult({ valid: false });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopySig = async (sig: string) => {
    try {
      await navigator.clipboard.writeText(sig);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Signature copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Ticket Mint">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <TicketIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Ticket Mint</h2>
              <p className="text-xs text-muted-foreground">Ed25519-signed · QR-verifiable · no fees</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {(["wallet", "verify", "issue"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition capitalize",
                tab === t
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
              )}
            >
              {t === "wallet" && "🎫 My wallet"}
              {t === "verify" && "✓ Verify"}
              {t === "issue" && "+ Issue"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* ── Wallet ── */}
            {tab === "wallet" && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TicketIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No tickets yet.</p>
                    <p className="text-xs mt-1">Issue one from the + Issue tab.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className={cn(
                          "text-left p-4 rounded-xl border transition",
                          selected?.id === t.id
                            ? "border-accent ring-1 ring-accent/30 bg-accent/5"
                            : "border-border/40 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-foreground line-clamp-1">{t.eventName}</p>
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(t.eventDate).toLocaleString()}</p>
                          <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {t.venue}</p>
                          <p className="flex items-center gap-1.5"><Armchair className="w-3 h-3" /> Seat {t.seat}</p>
                          <p className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> {t.price} {t.currency}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selected && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{selected.eventName}</h3>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="bg-white rounded-xl p-2 shadow-sm">
                        <img
                          src={qrUrl(ticketQrData(selected))}
                          alt={`QR for ${selected.eventName}`}
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5 text-sm w-full">
                        <p><span className="text-muted-foreground">Date:</span> {new Date(selected.eventDate).toLocaleString()}</p>
                        <p><span className="text-muted-foreground">Venue:</span> {selected.venue}</p>
                        <p><span className="text-muted-foreground">Seat:</span> {selected.seat}</p>
                        <p><span className="text-muted-foreground">Holder:</span> @{selected.holder}</p>
                        <p><span className="text-muted-foreground">Price:</span> {selected.price} {selected.currency}</p>
                        <p><span className="text-muted-foreground">Issuer:</span> @{selected.issuer}</p>
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground mb-1">Ed25519 signature (hex)</p>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={selected.signature}
                              className="text-xs font-mono"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleCopySig(selected.signature)}
                              aria-label="Copy signature"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Signed with Ed25519 · verifies offline · public key: <code className="font-mono">{issuerPublicKey.slice(0, 24)}…</code></span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Verify ── */}
            {tab === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Paste a ticket payload + signature to verify it against the issuer&apos;s Ed25519 public key. Verification is offline — no DB lookup.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-sig">Signature (hex) — optional if included in the JSON below</Label>
                    <Input
                      id="v-sig"
                      placeholder="5d3f…"
                      value={verifySig}
                      onChange={(e) => setVerifySig(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-json">Ticket payload JSON</Label>
                    <Textarea
                      id="v-json"
                      placeholder={'{ "ticket": { "eventName": "…", … }, "signature": "…" }'}
                      value={verifyJson}
                      onChange={(e) => setVerifyJson(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || verifyJson.trim().length === 0}
                    className="bg-gradient-gold text-charcoal hover:opacity-90"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Verify signature
                  </Button>
                </div>

                {verifyResult && (
                  <div
                    className={cn(
                      "p-4 rounded-xl border flex items-center gap-3",
                      verifyResult.valid
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
                    )}
                  >
                    {verifyResult.valid ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    <div>
                      <p className="font-medium">
                        {verifyResult.valid ? "Signature is VALID" : "Signature is INVALID"}
                      </p>
                      <p className="text-xs opacity-80">
                        {verifyResult.valid
                          ? "This ticket was signed by the issuer's Ed25519 private key."
                          : "The signature does not match — ticket may be forged or tampered with."}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Issue ── */}
            {tab === "issue" && (
              <motion.div
                key="issue"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  For event organizers. Issue a signed Ed25519 ticket to a holder. The signature is computed server-side with the issuer&apos;s private key.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="i-name">Event name</Label>
                    <Input
                      id="i-name"
                      placeholder="e.g. Riyadh Symphony — Beethoven Night"
                      value={form.eventName}
                      onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="i-date">Event date & time</Label>
                    <Input
                      id="i-date"
                      type="datetime-local"
                      value={form.eventDate}
                      onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="i-venue">Venue</Label>
                    <Input
                      id="i-venue"
                      placeholder="e.g. King Abdullah Theatre"
                      value={form.venue}
                      onChange={(e) => setForm({ ...form, venue: e.target.value })}
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="i-seat">Seat</Label>
                    <Input
                      id="i-seat"
                      placeholder="e.g. A-12"
                      value={form.seat}
                      onChange={(e) => setForm({ ...form, seat: e.target.value })}
                      maxLength={40}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="i-holder">Holder (username)</Label>
                    <Input
                      id="i-holder"
                      placeholder="e.g. layla"
                      value={form.holder}
                      onChange={(e) => setForm({ ...form, holder: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="i-price">Price</Label>
                    <Input
                      id="i-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="i-currency">Currency</Label>
                    <Input
                      id="i-currency"
                      placeholder="SAR"
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 8) })}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleIssue}
                  disabled={issuing}
                  className="w-full bg-gradient-gold text-charcoal hover:opacity-90"
                >
                  {issuing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Issue signed ticket
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}
