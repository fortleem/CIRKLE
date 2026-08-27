// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Folder, Plus, Trash2, FolderPlus, Loader2, ChevronRight, ChevronDown,
  Share2, Copy, Filter, Zap, ArrowRight, FolderTree,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface NestedFolder {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  parentId: string | null;
  childrenIds: string[];
}

interface FolderTreeItem extends NestedFolder {
  children: NestedFolder[];
}

interface SmartFilter {
  id: string;
  folderId: string;
  userId: string;
  rule: "unread_gt" | "mention_eq" | "type_eq" | "last_activity_within";
  param: string;
  createdAt: string;
}

interface ShareLink {
  id: string;
  folderId: string;
  ownerId: string;
  shareCode: string;
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
}

const COLORS = [
  { id: "teal", hex: "#14b8a6" },
  { id: "amber", hex: "#f59e0b" },
  { id: "rose", hex: "#f43f5e" },
  { id: "violet", hex: "#8b5cf6" },
  { id: "emerald", hex: "#10b981" },
  { id: "sky", hex: "#0ea5e9" },
  { id: "orange", hex: "#f97316" },
  { id: "pink", hex: "#ec4899" },
];

const ICONS = ["📁", "💼", "👨‍👩‍👧", "🎓", "💰", "🎮", "❤️", "🏠", "🚀", "⭐", "🔒", "📌"];

const RULE_LABELS: Record<string, string> = {
  unread_gt: "Unread count > N",
  mention_eq: "Has mentions",
  type_eq: "Conversation type is",
  last_activity_within: "Active in last N hours",
};

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function ChatFoldersPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";

  const [tree, setTree] = useState<FolderTreeItem[]>([]);
  const [filters, setFilters] = useState<SmartFilter[]>([]);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<NestedFolder | null>(null);
  const [tab, setTab] = useState<"folders" | "filters" | "shares">("folders");

  // Create form
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("teal");
  const [parentId, setParentId] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  // Filter form
  const [filterFolderId, setFilterFolderId] = useState("");
  const [filterRule, setFilterRule] = useState<SmartFilter["rule"]>("unread_gt");
  const [filterParam, setFilterParam] = useState("3");

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/chat-folders-plus?userId=${encodeURIComponent(userId)}&tree=1`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree ?? []);
      }
      const fRes = await fetchWithTimeout(
        `/api/chat-folders-plus?userId=${encodeURIComponent(userId)}&filters=1`,
        { cache: "no-store" },
      );
      if (fRes.ok) setFilters((await fRes.json()).filters ?? []);
      const sRes = await fetchWithTimeout(
        `/api/chat-folders-plus?userId=${encodeURIComponent(userId)}&shares=1`,
        { cache: "no-store" },
      );
      if (sRes.ok) setShares((await sRes.json()).shares ?? []);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  const handleCreate = async () => {
    if (!userId || !name.trim()) return;
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/chat-folders-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          userId,
          name: name.trim(),
          icon,
          color,
          parentId: parentId === "none" ? null : parentId,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "create failed");
      }
      toast.success("Folder created");
      setName("");
      setParentId("none");
      await fetchAll();
      window.dispatchEvent(new CustomEvent("circle:chat-folders-plus", {
        detail: { action: "create", name },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateFilter = async () => {
    if (!userId || !filterFolderId) return;
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/chat-folders-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createFilter",
          folderId: filterFolderId,
          userId,
          rule: filterRule,
          param: filterParam,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "filter create failed");
      }
      toast.success("Smart filter created");
      await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateShare = async (folderId: string) => {
    if (!userId) return;
    try {
      const res = await fetchWithTimeout("/api/chat-folders-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createShare",
          folderId,
          ownerId: userId,
          expiresInHours: 168, // 7 days
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "share create failed");
      }
      toast.success("Share link created");
      await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    try {
      await fetchWithTimeout("/api/chat-folders-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteFilter", filterId }),
      });
      setFilters((cur) => cur.filter((f) => f.id !== filterId));
      toast.success("Filter removed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await fetchWithTimeout("/api/chat-folders-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeShare", shareId }),
      });
      setShares((cur) => cur.filter((s) => s.id !== shareId));
      toast.success("Share revoked");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(`Code copied: ${code}`),
      () => toast.error("Copy failed"),
    );
  };

  const toggleExpand = (id: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flatFolders = tree.flatMap((r) => [r, ...r.children]);

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Chat Folders — Plus">
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
              <FolderTree className="size-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                Chat Folders <Plus className="size-4 text-emerald-500" />
              </h2>
              <p className="text-xs text-muted-foreground">Nested folders, smart filters, sharing</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <nav className="flex items-center gap-1 px-4 py-2 border-b border-border/40" aria-label="Sections">
          {(["folders", "filters", "shares"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                tab === t
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              aria-pressed={tab === t}
            >
              {t === "folders" && "Folders"}
              {t === "filters" && "Smart Filters"}
              {t === "shares" && "Shared Links"}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
            </div>
          )}

          {!loading && tab === "folders" && (
            <>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                <Label>Create new folder</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Folder name (e.g. Work, Family)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Parent (optional)</Label>
                    <Select value={parentId} onValueChange={setParentId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="None (root)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (root)</SelectItem>
                        {flatFolders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.icon} {f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Select value={color} onValueChange={setColor}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLORS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Icon</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ICONS.map((i) => (
                      <button
                        key={i}
                        onClick={() => setIcon(i)}
                        className={cn("size-8 rounded-md flex items-center justify-center text-lg transition-colors",
                          icon === i ? "bg-emerald-500/15 ring-1 ring-emerald-500/40" : "hover:bg-muted/40")}
                        aria-pressed={icon === i}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !name.trim() || !userId}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
                  Create Folder
                </Button>
              </div>

              <div className="space-y-2">
                {tree.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No folders yet. Create your first folder above.
                  </div>
                )}
                {tree.map((root) => (
                  <div key={root.id} className="rounded-xl border border-border/60 bg-card/40">
                    <div className="flex items-center gap-2 p-3">
                      <button
                        onClick={() => toggleExpand(root.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={expanded.has(root.id) ? "Collapse" : "Expand"}
                      >
                        {root.children.length > 0 ? (
                          expanded.has(root.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
                        ) : (
                          <div className="size-4" />
                        )}
                      </button>
                      <span className="text-lg">{root.icon}</span>
                      <span className="font-medium text-sm flex-1">{root.name}</span>
                      {root.children.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {root.children.length} sub
                        </Badge>
                      )}
                      <button
                        onClick={() => handleCreateShare(root.id)}
                        className="text-muted-foreground hover:text-emerald-600"
                        aria-label="Share"
                      >
                        <Share2 className="size-3.5" />
                      </button>
                    </div>
                    {expanded.has(root.id) && root.children.length > 0 && (
                      <div className="pl-10 pb-2 space-y-1">
                        {root.children.map((child) => (
                          <div key={child.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40">
                            <span className="text-base">{child.icon}</span>
                            <span className="text-sm flex-1">{child.name}</span>
                            <button
                              onClick={() => handleCreateShare(child.id)}
                              className="text-muted-foreground hover:text-emerald-600"
                              aria-label="Share"
                            >
                              <Share2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && tab === "filters" && (
            <>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-emerald-500" />
                  <Label>Smart filter rule</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-assign conversations to a folder when they match a rule.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Folder</Label>
                    <Select value={filterFolderId} onValueChange={setFilterFolderId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select folder" /></SelectTrigger>
                      <SelectContent>
                        {flatFolders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.icon} {f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Rule</Label>
                    <Select value={filterRule} onValueChange={(v) => setFilterRule(v as SmartFilter["rule"])}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RULE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Parameter</Label>
                  <Input
                    value={filterParam}
                    onChange={(e) => setFilterParam(e.target.value)}
                    placeholder="e.g. 3, group, 24"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleCreateFilter}
                  disabled={creating || !filterFolderId || !userId}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                  Add Filter
                </Button>
              </div>

              <div className="space-y-2">
                {filters.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No smart filters yet.
                  </div>
                )}
                {filters.map((f) => {
                  const folder = flatFolders.find((x) => x.id === f.folderId);
                  return (
                    <div key={f.id} className="rounded-xl border border-border/60 bg-card/40 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {folder?.icon ?? "📁"} {folder?.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {RULE_LABELS[f.rule]} = {f.param}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFilter(f.id)}
                        className="text-muted-foreground hover:text-rose-600"
                        aria-label="Delete filter"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && tab === "shares" && (
            <div className="space-y-2">
              {shares.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Share2 className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No shared folder links. Create one from a folder.
                  </p>
                </div>
              )}
              {shares.map((s) => {
                const folder = flatFolders.find((x) => x.id === s.folderId);
                return (
                  <div key={s.id} className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        {folder?.icon ?? "📁"} {folder?.name ?? "Unknown"}
                      </p>
                      <button
                        onClick={() => handleRevokeShare(s.id)}
                        className="text-muted-foreground hover:text-rose-600"
                        aria-label="Revoke share"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5 flex items-center justify-between">
                      <code className="text-xs">{s.shareCode}</code>
                      <button
                        onClick={() => copyCode(s.shareCode)}
                        className="text-muted-foreground hover:text-emerald-600"
                        aria-label="Copy code"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{s.viewCount} views</span>
                      {s.expiresAt && (
                        <span>Expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
