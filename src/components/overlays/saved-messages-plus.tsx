// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark, Loader2, Search, Trash2, Tag, Folder, Star, Download,
  Plus, ChevronDown, ChevronRight, FileText, Hash, Palette,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Collection {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isFavorites: boolean;
}

interface TagRecord {
  id: string;
  label: string;
  color: string;
}

interface SavedItem {
  saved: {
    id: string;
    userId: string;
    messageId: string;
    conversationId: string;
    note: string | null;
    createdAt: string;
  };
  meta: {
    id: string;
    collectionId: string | null;
    tagIds: string[];
    labelColor: string;
    isFavorite: boolean;
  } | null;
}

const PALETTE = ["#94a3b8", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981", "#0ea5e9", "#f97316"];

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function SavedMessagesPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";

  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | "favorites" | "all">("all");
  const [query, setQuery] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollEmoji, setNewCollEmoji] = useState("📁");
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      if (selectedCollection === "favorites") params.set("favorites", "1");
      else if (selectedCollection !== "all") params.set("collectionId", selectedCollection);
      const res = await fetchWithTimeout(`/api/saved-messages-plus?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections ?? []);
        setTags(data.tags ?? []);
        setItems(data.items ?? []);
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [userId, selectedCollection]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  const filtered = items.filter((i) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (i.saved.note ?? "").toLowerCase().includes(q) ||
      i.saved.messageId.toLowerCase().includes(q) ||
      i.saved.conversationId.toLowerCase().includes(q)
    );
  });

  const handleCreateCollection = async () => {
    if (!userId || !newCollName.trim()) return;
    setCreatingCollection(true);
    try {
      const res = await fetchWithTimeout("/api/saved-messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createCollection", userId, name: newCollName.trim(), emoji: newCollEmoji }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "create failed");
      }
      toast.success("Collection created");
      setNewCollName("");
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:saved-messages-plus", {
        detail: { action: "createCollection", name: newCollName },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleCreateTag = async () => {
    if (!userId || !newTagLabel.trim()) return;
    setCreatingTag(true);
    try {
      const res = await fetchWithTimeout("/api/saved-messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createTag", userId, label: newTagLabel.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "tag create failed");
      }
      toast.success("Tag created");
      setNewTagLabel("");
      await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingTag(false);
    }
  };

  const handleToggleFavorite = async (savedMessageId: string) => {
    try {
      const res = await fetchWithTimeout("/api/saved-messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleFavorite", userId, savedMessageId }),
      });
      if (res.ok) await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleAssignCollection = async (savedMessageId: string, collectionId: string | null) => {
    try {
      const res = await fetchWithTimeout("/api/saved-messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignToCollection", userId, savedMessageId, collectionId }),
      });
      if (res.ok) await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleToggleTag = async (savedMessageId: string, currentTags: string[], tagId: string) => {
    const next = currentTags.includes(tagId)
      ? currentTags.filter((t) => t !== tagId)
      : [...currentTags, tagId];
    try {
      const res = await fetchWithTimeout("/api/saved-messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "applyTags", userId, savedMessageId, tagIds: next }),
      });
      if (res.ok) await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleExport = async (format: "json" | "md") => {
    if (!userId) return;
    try {
      const res = await fetchWithTimeout(`/api/saved-messages-plus?userId=${encodeURIComponent(userId)}&export=${format}`);
      if (!res.ok) throw new Error("export failed");
      const blob = format === "md" ? new Blob([await res.text()], { type: "text/markdown" }) : await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "md" ? "saved-messages.md" : "saved-messages.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-3xl" ariaLabel="Saved Messages — Plus">
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/10 via-transparent to-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
              <Bookmark className="size-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                Saved Messages <Star className="size-4 text-amber-500" />
              </h2>
              <p className="text-xs text-muted-foreground">{items.length} saved · {collections.length} collections · {tags.length} tags</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleExport("md")} aria-label="Export Markdown">
              <FileText className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport("json")} aria-label="Export JSON">
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Sidebar-like filter row */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCollection("all")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap",
                selectedCollection === "all" ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground hover:bg-muted/40")}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setSelectedCollection("favorites")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap",
                selectedCollection === "favorites" ? "bg-amber-500/15 text-amber-600" : "text-muted-foreground hover:bg-muted/40")}
            >
              ⭐ Favorites
            </button>
            {collections.filter((c) => !c.isFavorites).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCollection(c.id)}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap",
                  selectedCollection === c.id ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground hover:bg-muted/40")}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved messages…"
              className="pl-9"
              aria-label="Search saved messages"
            />
          </div>

          {/* Create collection */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
            <Label className="text-xs">New collection</Label>
            <div className="flex gap-2">
              <select
                value={newCollEmoji}
                onChange={(e) => setNewCollEmoji(e.target.value)}
                className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                aria-label="Emoji"
              >
                {["📁", "💼", "💰", "❤️", "🎮", "🏠", "🚀", "📌", "⭐", "🎯", "🔒", "📚"].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <Input
                value={newCollName}
                onChange={(e) => setNewCollName(e.target.value)}
                placeholder="Collection name"
                className="flex-1"
              />
              <Button onClick={handleCreateCollection} disabled={creatingCollection || !newCollName.trim() || !userId} size="sm">
                {creatingCollection ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              </Button>
            </div>
          </div>

          {/* Create tag */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
            <Label className="text-xs">New tag</Label>
            <div className="flex gap-2">
              <Input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="Tag label"
                className="flex-1"
              />
              <Button onClick={handleCreateTag} disabled={creatingTag || !newTagLabel.trim() || !userId} size="sm">
                {creatingTag ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map((t) => (
                  <Badge key={t.id} variant="outline" style={{ borderColor: t.color, color: t.color }}>
                    <Hash className="size-2.5 mr-0.5" />
                    {t.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Saved messages list */}
          {loading && (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Bookmark className="size-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No saved messages match this filter.</p>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((item) => {
              const isExpanded = expandedItem === item.saved.id;
              return (
                <motion.div
                  key={item.saved.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 bg-card/40 overflow-hidden"
                  style={{ borderLeftColor: item.meta?.labelColor ?? "#94a3b8", borderLeftWidth: 3 }}
                >
                  <div className="p-3 flex items-start gap-3">
                    <button
                      onClick={() => handleToggleFavorite(item.saved.id)}
                      className={cn("mt-0.5", item.meta?.isFavorite ? "text-amber-500" : "text-muted-foreground/50 hover:text-amber-500")}
                      aria-label={item.meta?.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star className={cn("size-4", item.meta?.isFavorite && "fill-current")} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Conv: <code className="text-[10px]">{item.saved.conversationId.slice(0, 12)}</code>
                      </p>
                      {item.saved.note && (
                        <p className="text-sm mt-1 line-clamp-2">{item.saved.note}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.meta?.collectionId && (() => {
                          const c = collections.find((x) => x.id === item.meta!.collectionId);
                          return c ? (
                            <Badge variant="outline" style={{ borderColor: c.color, color: c.color }}>
                              {c.emoji} {c.name}
                            </Badge>
                          ) : null;
                        })()}
                        {item.meta && item.meta.tagIds.length > 0 && item.meta.tagIds.map((tid) => {
                          const t = tags.find((x) => x.id === tid);
                          if (!t) return null;
                          return (
                            <Badge key={tid} variant="outline" className="text-[10px]" style={{ borderColor: t.color, color: t.color }}>
                              #{t.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.saved.id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Expand"
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border/40 p-3 space-y-3 bg-muted/20">
                      <div>
                        <Label className="text-xs">Collection</Label>
                        <select
                          value={item.meta?.collectionId ?? ""}
                          onChange={(e) => handleAssignCollection(item.saved.id, e.target.value || null)}
                          className="mt-1 w-full px-2 py-1 rounded-md border border-border bg-background text-sm"
                        >
                          <option value="">None</option>
                          {collections.filter((c) => !c.isFavorites).map((c) => (
                            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Tags</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {tags.map((t) => {
                            const selected = item.meta?.tagIds.includes(t.id) ?? false;
                            return (
                              <button
                                key={t.id}
                                onClick={() => handleToggleTag(item.saved.id, item.meta?.tagIds ?? [], t.id)}
                                className={cn("px-2 py-0.5 text-xs rounded-md border transition-colors",
                                  selected ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/40" : "border-border text-muted-foreground")}
                                style={selected ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}15` } : {}}
                              >
                                #{t.label}
                              </button>
                            );
                          })}
                          {tags.length === 0 && (
                            <span className="text-xs text-muted-foreground">Create a tag first.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Color label</Label>
                        <div className="flex gap-1.5 mt-1">
                          {PALETTE.map((c) => (
                            <button
                              key={c}
                              onClick={async () => {
                                try {
                                  await fetchWithTimeout("/api/saved-messages-plus", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "setColor", userId, savedMessageId: item.saved.id, color: c }),
                                  });
                                  await fetchAll();
                                } catch (err) {
                                  toast.error((err as Error).message);
                                }
                              }}
                              className={cn("size-5 rounded-md transition-transform", (item.meta?.labelColor ?? "#94a3b8") === c && "ring-2 ring-offset-1 ring-offset-background")}
                              style={{ backgroundColor: c }}
                              aria-label={`Color ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}
