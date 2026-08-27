// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Folder, Plus, Trash2, FolderPlus, Loader2, MessageSquare, ChevronRight, Pencil,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

interface FolderAssignment {
  id: string;
  folderId: string;
  conversationId: string;
  userId: string;
  addedAt: string;
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

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function ChatFolders({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [assignments, setAssignments] = useState<FolderAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Create-form
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("teal");
  const [creating, setCreating] = useState(false);

  // Selected folder view (assign conversations)
  const [selected, setSelected] = useState<ChatFolder | null>(null);
  const [newConvId, setNewConvId] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const fetchFolders = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/chat-folders?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setFolders(data.folders ?? []);
      setAssignments(data.assignments ?? []);
    } catch {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setName("");
      setIcon("📁");
      setColor("teal");
      setSelected(null);
      setNewConvId("");
      fetchFolders();
    }
  }, [open, fetchFolders]);

  const handleCreate = async () => {
    if (!userId) {
      toast.error("Sign in to create folders");
      return;
    }
    if (name.trim().length < 1) {
      toast.error("Folder name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/chat-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: name.trim(), icon, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder");
      toast.success(`Folder "${data.folder.name}" created`);
      setFolders((prev) => [...prev, data.folder]);
      setName("");
      window.dispatchEvent(new CustomEvent("circle:chat-folders"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const handleAddConversation = async (folderId: string) => {
    const convId = newConvId.trim();
    if (!convId) {
      toast.error("Conversation ID is required");
      return;
    }
    try {
      const res = await fetchWithTimeout(`/api/chat-folders/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, userId, action: "add" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success("Conversation added");
      setAssignments((prev) => [...prev.filter((a) => a.id !== data.assignment?.id), data.assignment]);
      setNewConvId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add failed");
    }
  };

  const handleRemoveConversation = async (folderId: string, conversationId: string) => {
    try {
      const res = await fetchWithTimeout(`/api/chat-folders/${folderId}`, {
        method: "DELETE",
        headers: {},
      });
      void conversationId;
      void res;
      // Note: the route expects ?conversationId=... — use URL form
      const res2 = await fetchWithTimeout(
        `/api/chat-folders/${folderId}?conversationId=${encodeURIComponent(conversationId)}`,
        { method: "DELETE" },
      );
      const data = await res2.json();
      if (!res2.ok) throw new Error(data.error || "Failed to remove");
      setAssignments((prev) => prev.filter((a) => !(a.folderId === folderId && a.conversationId === conversationId)));
      toast.success("Conversation removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  const handleDelete = async (folderId: string) => {
    try {
      const res = await fetchWithTimeout(`/api/chat-folders/${folderId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Folder deleted");
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setAssignments((prev) => prev.filter((a) => a.folderId !== folderId));
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleRename = async (folderId: string) => {
    if (renameVal.trim().length < 1) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      const res = await fetchWithTimeout(`/api/chat-folders/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", name: renameVal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename");
      setFolders((prev) => prev.map((f) => (f.id === folderId ? data.folder : f)));
      if (selected?.id === folderId) setSelected(data.folder);
      setRenaming(null);
      toast.success("Folder renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const folderConvs = (folderId: string) => assignments.filter((a) => a.folderId === folderId);
  const colorHex = (id: string) => COLORS.find((c) => c.id === id)?.hex ?? "#14b8a6";

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Chat folders — organize your conversations">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Folder className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chat Folders</h2>
              <p className="text-xs text-muted-foreground">Organize chats by work · family · projects</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Create form */}
          <section aria-label="Create folder" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-500" aria-hidden />
              <h3 className="font-semibold text-foreground text-sm">New folder</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g. Work, Family, Crypto…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Folder icon">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={icon === i}
                    onClick={() => setIcon(i)}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition",
                      icon === i ? "border-emerald-500 bg-emerald-500/10" : "border-transparent bg-muted/40 hover:bg-muted/60",
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Folder color">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={color === c.id}
                    aria-label={c.id}
                    onClick={() => setColor(c.id)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition",
                      color === c.id ? "ring-2 ring-offset-2 ring-offset-background" : "border-transparent",
                    )}
                    style={{ background: c.hex, boxShadow: color === c.id ? `0 0 0 2px ${c.hex}` : undefined }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Creating…</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" aria-hidden /> Create folder</>
              )}
            </Button>
          </section>

          {/* Folders list */}
          <section aria-label="Your folders" className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Your folders ({folders.length})</Label>
            {loading && folders.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground" aria-live="polite">
                <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
              </div>
            ) : folders.length === 0 ? (
              <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
                <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                <p className="text-sm text-muted-foreground">No folders yet — create your first folder above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map((f) => {
                  const convs = folderConvs(f.id);
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                          style={{ background: `${colorHex(f.color)}25`, border: `1px solid ${colorHex(f.color)}55` }}
                          aria-hidden
                        >
                          {f.icon}
                        </div>
                        <button
                          onClick={() => setSelected(f)}
                          className="flex-1 text-left min-w-0"
                          aria-label={`Open folder ${f.name}`}
                        >
                          {renaming === f.id ? (
                            <Input
                              value={renameVal}
                              onChange={(e) => setRenameVal(e.target.value)}
                              onBlur={() => handleRename(f.id)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRename(f.id); }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                          ) : (
                            <h4 className="font-semibold text-foreground text-sm truncate">{f.name}</h4>
                          )}
                          <p className="text-xs text-muted-foreground">{convs.length} conversation{convs.length !== 1 ? "s" : ""}</p>
                        </button>
                        <Badge
                          className="border text-[10px]"
                          style={{ background: `${colorHex(f.color)}15`, color: colorHex(f.color), borderColor: `${colorHex(f.color)}55` }}
                        >
                          {f.color}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Rename ${f.name}`}
                          onClick={() => { setRenaming(f.id); setRenameVal(f.name); }}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Delete ${f.name}`}
                          onClick={() => handleDelete(f.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                      </div>

                      <AnimatePresence>
                        {selected?.id === f.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-border/40 space-y-2"
                          >
                            <Label className="text-xs text-muted-foreground">Conversations in this folder</Label>
                            {convs.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No conversations yet</p>
                            ) : (
                              <ul className="space-y-1 max-h-32 overflow-y-auto">
                                {convs.map((c) => (
                                  <li key={c.id} className="flex items-center gap-2 text-xs">
                                    <MessageSquare className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="font-mono text-muted-foreground flex-1 truncate">{c.conversationId}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      aria-label="Remove conversation"
                                      onClick={() => handleRemoveConversation(f.id, c.conversationId)}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add conversation ID…"
                                value={newConvId}
                                onChange={(e) => setNewConvId(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddConversation(f.id); }}
                                className="h-8 text-xs"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => handleAddConversation(f.id)}
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden />
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </OverlayShell>
  );
}
