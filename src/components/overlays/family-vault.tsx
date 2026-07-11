"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Loader2, Lock, Unlock, Image as ImageIcon, FileText, Video,
  StickyNote, Users, ShieldCheck, Download, Upload,
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

interface Family {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
}

interface VaultItem {
  id: string;
  familyId: string;
  type: "photo" | "video" | "document" | "note";
  title: string;
  encryptedData: string;
  uploadedBy: string;
  createdAt: string;
}

// ── Web Crypto helpers (AES-256-GCM with PBKDF2-derived key) ────────────────

const PBKDF2_ITER = 200_000;
const SALT_LEN = 16;
const IV_LEN = 12;

// Copy a Uint8Array into a fresh ArrayBuffer. TS 5.7+ types Web Crypto's
// `BufferSource` as `ArrayBufferView<ArrayBuffer> | ArrayBuffer`, which a
// `Uint8Array<ArrayBufferLike>` (the return type of `getRandomValues` and
// `new Uint8Array(n)`) is not assignable to. Copying into a fresh
// `ArrayBuffer` is the type-safe workaround.
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(arr.byteLength);
  new Uint8Array(ab).set(arr);
  return ab;
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToAb(b64: string): ArrayBuffer {
  const s = atob(b64);
  const ab = new ArrayBuffer(s.length);
  const out = new Uint8Array(ab);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return ab;
}

async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(passphrase)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt UTF-8 plaintext with AES-256-GCM. Returns `salt:iv:ct` base64. */
async function encryptString(plaintext: string, passphrase: string): Promise<string> {
  const salt = toArrayBuffer(crypto.getRandomValues(new Uint8Array(SALT_LEN)));
  const iv = toArrayBuffer(crypto.getRandomValues(new Uint8Array(IV_LEN)));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toArrayBuffer(new TextEncoder().encode(plaintext)),
  );
  return [bufToB64(new Uint8Array(salt)), bufToB64(new Uint8Array(iv)), bufToB64(new Uint8Array(ct))].join(":");
}

/** Decrypt a `salt:iv:ct` blob. Throws on wrong passphrase (GCM auth fail). */
async function decryptString(blob: string, passphrase: string): Promise<string> {
  const parts = blob.split(":");
  if (parts.length !== 3) throw new Error("Malformed blob.");
  const [saltB64, ivB64, ctB64] = parts;
  const salt = b64ToAb(saltB64);
  const iv = b64ToAb(ivB64);
  const ct = b64ToAb(ctB64);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ── Component ──────────────────────────────────────────────────────────────

const TYPE_META = {
  photo:    { label: "Photo",    icon: ImageIcon, tint: "bg-primary/15 text-primary" },
  video:    { label: "Video",    icon: Video,     tint: "bg-accent/15 text-accent" },
  document: { label: "Document", icon: FileText,  tint: "bg-secondary/15 text-secondary" },
  note:     { label: "Note",     icon: StickyNote, tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
} as const;

export function FamilyVault({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";

  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Passphrase gate — keyed per family in sessionStorage so the user only
  // enters it once per session.
  const [passphrases, setPassphrases] = useState<Record<string, string>>({});
  const [passphraseInput, setPassphraseInput] = useState("");
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  // Create-family form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [creating, setCreating] = useState(false);

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [upType, setUpType] = useState<VaultItem["type"]>("note");
  const [upTitle, setUpTitle] = useState("");
  const [upBody, setUpBody] = useState("");
  const [upPass, setUpPass] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vault/family?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { families: Family[] };
      setFamilies(data.families);
    } catch {
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  const fetchItems = useCallback(async (familyId: string) => {
    try {
      const res = await fetch(`/api/vault?familyId=${encodeURIComponent(familyId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { items: VaultItem[] };
      setItems(data.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (open) fetchFamilies();
  }, [open, fetchFamilies]);

  useEffect(() => {
    if (open && activeFamily) fetchItems(activeFamily.id);
  }, [open, activeFamily, fetchItems]);

  // Restore passphrases from sessionStorage on mount.
  useEffect(() => {
    if (!open) return;
    try {
      const raw = sessionStorage.getItem("cirkle-vault-passes");
      if (raw) setPassphrases(JSON.parse(raw));
    } catch {
      /* no-op */
    }
  }, [open]);

  const savePassphrase = (familyId: string, pass: string) => {
    setPassphrases((prev) => {
      const next = { ...prev, [familyId]: pass };
      try {
        sessionStorage.setItem("cirkle-vault-passes", JSON.stringify(next));
      } catch {
        /* no-op */
      }
      return next;
    });
  };

  const handleCreateFamily = async () => {
    const name = newName.trim();
    if (name.length < 1) {
      toast.error("Family name is required");
      return;
    }
    const members = newMembers
      .split(/[,\n]/)
      .map((m) => m.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);
    setCreating(true);
    try {
      const res = await fetch("/api/vault/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, members, createdBy: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create family");
      toast.success("Family vault created");
      setShowCreate(false);
      setNewName("");
      setNewMembers("");
      await fetchFamilies();
      setActiveFamily(data.family as Family);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create family");
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!activeFamily) return;
    const title = upTitle.trim();
    const body = upBody;
    if (title.length < 1) {
      toast.error("Title is required");
      return;
    }
    if (body.length < 1) {
      toast.error("Content is empty");
      return;
    }
    if (upPass.length < 6) {
      toast.error("Passphrase must be at least 6 characters");
      return;
    }
    setUploading(true);
    try {
      const encryptedData = await encryptString(body, upPass);
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: activeFamily.id,
          type: upType,
          title,
          encryptedData,
          uploadedBy: username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");
      // Cache the passphrase so the user can immediately decrypt what they uploaded.
      savePassphrase(activeFamily.id, upPass);
      toast.success("Encrypted item uploaded");
      setShowUpload(false);
      setUpTitle("");
      setUpBody("");
      setUpPass("");
      await fetchItems(activeFamily.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const handleUnlock = async () => {
    if (!activeFamily) return;
    if (passphraseInput.length < 6) {
      toast.error("Passphrase must be at least 6 characters");
      return;
    }
    savePassphrase(activeFamily.id, passphraseInput);
    setPassphraseInput("");
    toast.success("Vault unlocked");
  };

  const handleDecrypt = async (item: VaultItem) => {
    if (!activeFamily) return;
    const pass = passphrases[activeFamily.id];
    if (!pass) {
      toast.error("Enter the family passphrase first");
      return;
    }
    setDecryptingId(item.id);
    try {
      const pt = await decryptString(item.encryptedData, pass);
      setDecrypted((prev) => ({ ...prev, [item.id]: pt }));
    } catch {
      toast.error("Wrong passphrase — could not decrypt");
    } finally {
      setDecryptingId(null);
    }
  };

  const handleDownload = (item: VaultItem) => {
    const pt = decrypted[item.id];
    if (!pt) return;
    const blob = new Blob([pt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.replace(/[^a-z0-9-_]+/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unlocked = activeFamily ? !!passphrases[activeFamily.id] : false;

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Family Vault">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Family Vault</h2>
              <p className="text-xs text-muted-foreground">Encrypted · cloud-free · passphrase-protected</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* ── Family list ── */}
            {!activeFamily && (
              <motion.div
                key="families"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Your family vaults</p>
                  <Button variant="outline" size="sm" onClick={() => setShowCreate((s) => !s)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New family
                  </Button>
                </div>

                {showCreate && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fam-name">Family name</Label>
                      <Input
                        id="fam-name"
                        placeholder="e.g. Al-Harbi Family"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fam-members">Members (comma or newline separated)</Label>
                      <Textarea
                        id="fam-members"
                        placeholder="@layla, @yousef, @nour"
                        value={newMembers}
                        onChange={(e) => setNewMembers(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={handleCreateFamily}
                      disabled={creating}
                      className="bg-gradient-gold text-charcoal hover:opacity-90"
                    >
                      {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Create vault
                    </Button>
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : families.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No family vaults yet.</p>
                    <p className="text-xs mt-1">Create one to start storing encrypted memories.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {families.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFamily(f)}
                        className="text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/40 transition"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="font-medium text-foreground line-clamp-1">{f.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {f.members.length} members
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Vault grid ── */}
            {activeFamily && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <button
                  onClick={() => { setActiveFamily(null); setItems([]); setDecrypted({}); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ← Back to families
                </button>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{activeFamily.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeFamily.members.length} members · created {new Date(activeFamily.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unlocked ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <Unlock className="w-3.5 h-3.5" /> Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Passphrase gate */}
                {!unlocked && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Lock className="w-4 h-4" />
                      <p className="text-sm font-medium">Passphrase required</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the family passphrase to decrypt and view vault items. The passphrase is never sent to the server — it stays in your browser session.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Family passphrase"
                        value={passphraseInput}
                        onChange={(e) => setPassphraseInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
                      />
                      <Button onClick={handleUnlock} className="bg-gradient-gold text-charcoal hover:opacity-90">
                        <Unlock className="w-4 h-4 mr-1.5" /> Unlock
                      </Button>
                    </div>
                  </div>
                )}

                {/* Upload button */}
                {unlocked && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{items.length} encrypted items</p>
                    <Button variant="outline" size="sm" onClick={() => setShowUpload((s) => !s)}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                    </Button>
                  </div>
                )}

                {/* Upload form */}
                {unlocked && showUpload && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(TYPE_META) as VaultItem["type"][]).map((t) => {
                        const meta = TYPE_META[t];
                        const Icon = meta.icon;
                        return (
                          <button
                            key={t}
                            onClick={() => setUpType(t)}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition",
                              upType === t
                                ? "border-secondary bg-secondary/10"
                                : "border-border/40 hover:bg-muted/40",
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="up-title">Title</Label>
                      <Input
                        id="up-title"
                        placeholder="e.g. Grandma's recipe"
                        value={upTitle}
                        onChange={(e) => setUpTitle(e.target.value)}
                        maxLength={120}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="up-body">Content (text / base64 for files)</Label>
                      <Textarea
                        id="up-body"
                        placeholder="Paste the note text, or base64-encoded file content…"
                        value={upBody}
                        onChange={(e) => setUpBody(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="up-pass">Family passphrase (encrypts on client before upload)</Label>
                      <Input
                        id="up-pass"
                        type="password"
                        placeholder="Passphrase"
                        value={upPass}
                        onChange={(e) => setUpPass(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="bg-gradient-gold text-charcoal hover:opacity-90"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                      Encrypt & upload
                    </Button>
                  </div>
                )}

                {/* Items grid */}
                {unlocked && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {items.length === 0 ? (
                      <div className="col-span-full text-center py-10 text-muted-foreground">
                        <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Vault is empty. Upload an encrypted item to begin.</p>
                      </div>
                    ) : (
                      items.map((item) => {
                        const meta = TYPE_META[item.type];
                        const Icon = meta.icon;
                        const pt = decrypted[item.id];
                        return (
                          <div
                            key={item.id}
                            className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", meta.tint)}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  by @{item.uploadedBy} · {new Date(item.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {pt ? (
                              <div className="space-y-2">
                                <pre className="text-xs whitespace-pre-wrap break-words p-2 rounded-lg bg-background/60 border border-border/40 max-h-40 overflow-y-auto">
                                  {pt}
                                </pre>
                                <Button variant="outline" size="sm" onClick={() => handleDownload(item)} className="w-full">
                                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDecrypt(item)}
                                disabled={decryptingId === item.id}
                                className="w-full"
                              >
                                {decryptingId === item.id ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Decrypt
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}
