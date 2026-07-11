"use client";

/**
 * Knowledge Wiki — Blueprint §10.5.5, §26.4.
 *
 * IPFS-backed Markdown wikis inside any Circle. This overlay is the editor:
 *
 *   • Left sidebar  — list of pages in the current Circle + "New page" button.
 *   • Center pane   — Markdown editor (textarea) + live HTML preview.
 *   • Right sidebar — version history with diff view + restore.
 *
 * Open via the `circle:knowledge-wiki` event (registered in page.tsx +
 * overlay-registry.ts).
 *
 * The Markdown renderer is a tiny inline implementation (headings, bold,
 * italic, inline code, code blocks, links, lists, blockquotes, hr,
 * paragraphs) — kept dependency-free so the wiki renders identically on
 * every device, including the offline mesh.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  BookOpen,
  Plus,
  Loader2,
  RefreshCw,
  FileText,
  History,
  Save,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// ─────────────────────────────────────────────────────────────────────────────

interface WikiPage {
  id: string;
  circleId: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  version: number;
  ipfsHash: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WikiPageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  content: string;
  author: string;
  ipfsHash: string | null;
  createdAt: string;
}

interface CircleOption {
  id: string;
  name: string;
  avatarInitials: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal Markdown renderer (no deps)
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(s: string): string {
  // Inline code first (so we don't process markdown inside code).
  const codeStash: string[] = [];
  let out = s.replace(/`([^`]+)`/g, (_, code: string) => {
    codeStash.push(`<code class="px-1 py-0.5 rounded bg-muted text-secondary text-[0.85em]">${escapeHtml(code)}</code>`);
    return `\u0000${codeStash.length - 1}\u0000`;
  });

  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, text: string, url: string) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-secondary underline hover:text-accent inline-flex items-center gap-0.5">${escapeHtml(text)}<ExternalLink class="w-3 h-3 inline" /></a>`;
  });

  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic
  out = out.replace(/(^|\s)\*([^*]+)\*(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
  // Strikethrough
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Restore code stash
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codeStash[Number(i)] || "");
  return out;
}

function renderMarkdown(md: string): string {
  if (!md.trim()) return '<p class="text-muted-foreground text-sm italic">Nothing to preview yet.</p>';
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inQuote = false;
  let quoteBuf: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html.push(`<blockquote class="border-l-4 border-secondary/40 pl-3 my-2 text-muted-foreground italic">${quoteBuf.join("<br />")}</blockquote>`);
      quoteBuf = [];
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw;
    // Code fence
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre class="rounded-lg bg-charcoal/90 text-cream p-3 my-2 overflow-x-auto text-[11px] font-mono"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        closeQuote();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // Empty line — close any open list/quote
    if (line.trim() === "") {
      closeList();
      closeQuote();
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      closeList();
      closeQuote();
      html.push('<hr class="my-3 border-border/60" />');
      continue;
    }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      closeQuote();
      const level = h[1].length;
      const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-sm", "text-xs"];
      html.push(`<h${level} class="font-display font-bold mt-3 mb-1 ${sizes[level - 1]}">${renderInline(escapeHtml(h[2]))}</h${level}>`);
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      inQuote = true;
      quoteBuf.push(renderInline(escapeHtml(line.replace(/^>\s?/, ""))));
      continue;
    } else {
      closeQuote();
    }

    // Ordered list
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="list-decimal pl-5 my-2 space-y-0.5">');
        listType = "ol";
      }
      html.push(`<li>${renderInline(escapeHtml(ol[1]))}</li>`);
      continue;
    }
    // Unordered list
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="list-disc pl-5 my-2 space-y-0.5">');
        listType = "ul";
      }
      html.push(`<li>${renderInline(escapeHtml(ul[1]))}</li>`);
      continue;
    }

    // Paragraph (default)
    closeList();
    html.push(`<p class="my-1.5 leading-relaxed">${renderInline(escapeHtml(line))}</p>`);
  }

  // Flush trailing state
  if (inCode) {
    html.push(`<pre class="rounded-lg bg-charcoal/90 text-cream p-3 my-2 overflow-x-auto text-[11px] font-mono"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  closeList();
  closeQuote();

  return html.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff (line-based, very small)
// ─────────────────────────────────────────────────────────────────────────────

function lineDiff(oldText: string, newText: string): { type: "add" | "del" | "ctx"; text: string }[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const max = Math.max(oldLines.length, newLines.length);
  const out: { type: "add" | "del" | "ctx"; text: string }[] = [];
  for (let i = 0; i < max; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) out.push({ type: "ctx", text: o });
    } else {
      if (o !== undefined) out.push({ type: "del", text: o });
      if (n !== undefined) out.push({ type: "add", text: n });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function KnowledgeWiki({ open, onClose }: Props) {
  const { user } = useAuth();
  const me = user?.username || "guest";

  const [circleId, setCircleId] = useState<string>("general");
  const [circleName, setCircleName] = useState<string>("General Circle");
  const [circles, setCircles] = useState<CircleOption[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);

  const [pages, setPages] = useState<WikiPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [page, setPage] = useState<WikiPage | null>(null);
  const [history, setHistory] = useState<WikiPageVersion[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // New-page form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPage, setNewPage] = useState({ title: "", slug: "" });
  const [creating, setCreating] = useState(false);

  // Diff view
  const [diffVersion, setDiffVersion] = useState<number | null>(null);

  // ── Load circles ──────────────────────────────────────────────────────
  const loadCircles = useCallback(async () => {
    setCirclesLoading(true);
    try {
      const res = await fetch("/api/circles", { cache: "no-store" });
      if (!res.ok) throw new Error("failed to load circles");
      const data = (await res.json()) as CircleOption[];
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((c) => ({
          id: String(c.id),
          name: String(c.name || c.id),
          avatarInitials: String((c as { avatarInitials?: string }).avatarInitials || "🔄"),
        }));
        setCircles(mapped);
        // Don't override a previously chosen circle.
        setCircleId((cur) => (cur || mapped[0].id));
        setCircleName((cur) => {
          if (cur) return cur;
          return mapped[0].name;
        });
      }
    } catch {
      // Fall back to a single "general" circle.
      setCircles([{ id: "general", name: "General Circle", avatarInitials: "GC" }]);
    } finally {
      setCirclesLoading(false);
    }
  }, []);

  // ── Load pages ────────────────────────────────────────────────────────
  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const res = await fetch(`/api/wiki/pages?circleId=${encodeURIComponent(circleId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed to load pages");
      const data = (await res.json()) as { pages: WikiPage[] };
      setPages(data.pages);
      // Auto-select the first page if none selected.
      if (data.pages.length > 0 && !selectedSlug) {
        setSelectedSlug(data.pages[0].slug);
      } else if (data.pages.length === 0) {
        setSelectedSlug(null);
        setPage(null);
        setHistory([]);
      }
    } catch (err) {
      toast.error("Couldn't load wiki pages", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPagesLoading(false);
    }
  }, [circleId, selectedSlug]);

  // ── Load selected page + history ──────────────────────────────────────
  const loadPage = useCallback(async (slug: string) => {
    setPageLoading(true);
    setHistoryLoading(true);
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`/api/wiki/pages/${encodeURIComponent(slug)}?circleId=${encodeURIComponent(circleId)}`, { cache: "no-store" }),
        fetch(`/api/wiki/pages/${encodeURIComponent(slug)}/history?circleId=${encodeURIComponent(circleId)}`, { cache: "no-store" }),
      ]);
      if (!pRes.ok) {
        if (pRes.status === 404) {
          setPage(null);
          setHistory([]);
          return;
        }
        throw new Error("failed to load page");
      }
      const pData = (await pRes.json()) as { page: WikiPage };
      setPage(pData.page);
      setEditTitle(pData.page.title);
      setEditContent(pData.page.content);
      setDirty(false);
      setDiffVersion(null);

      if (hRes.ok) {
        const hData = (await hRes.json()) as { history: WikiPageVersion[] };
        setHistory(hData.history);
      } else {
        setHistory([]);
      }
    } catch (err) {
      toast.error("Couldn't load page", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPageLoading(false);
      setHistoryLoading(false);
    }
  }, [circleId]);

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    loadCircles();
  }, [open, loadCircles]);

  useEffect(() => {
    if (!open || !circleId) return;
    loadPages();
  }, [open, circleId]);

  useEffect(() => {
    if (!open || !selectedSlug || !circleId) return;
    loadPage(selectedSlug);
  }, [open, selectedSlug, circleId]);

  // ── Create page ───────────────────────────────────────────────────────
  const createPage = useCallback(async () => {
    const title = newPage.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    const slug = (newPage.slug.trim() || slugify(title)).toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug)) {
      toast.error("Slug must be lowercase alphanumerics + hyphens (1–80 chars)");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleId,
          slug,
          title,
          content: `# ${title}\n\nStart writing your wiki page…`,
          author: me,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to create page");
      }
      toast.success("Page created", { description: `/${slug}` });
      setNewPage({ title: "", slug: "" });
      setShowNewForm(false);
      await loadPages();
      setSelectedSlug(slug);
    } catch (err) {
      toast.error("Couldn't create page", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }, [circleId, me, newPage, loadPages]);

  // ── Save page ─────────────────────────────────────────────────────────
  const savePage = useCallback(async () => {
    if (!page) return;
    if (!dirty) {
      toast("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/wiki/pages/${encodeURIComponent(page.slug)}?circleId=${encodeURIComponent(circleId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: page.id,
            title: editTitle,
            content: editContent,
            author: me,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to save");
      }
      const data = (await res.json()) as { page: WikiPage };
      toast.success("Saved", { description: `Version ${data.page.version}` });
      setDirty(false);
      setPage(data.page);
      // Refresh history + page list.
      await loadPage(page.slug);
      await loadPages();
    } catch (err) {
      toast.error("Couldn't save page", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [page, dirty, editTitle, editContent, me, circleId, loadPage, loadPages]);

  // ── Delete page ───────────────────────────────────────────────────────
  const deletePage = useCallback(async () => {
    if (!page) return;
    if (!confirm(`Delete "${page.title}"? This removes all versions.`)) return;
    try {
      const res = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: page.id }),
      });
      if (!res.ok) throw new Error("failed to delete");
      toast.success("Page deleted");
      setSelectedSlug(null);
      setPage(null);
      setHistory([]);
      await loadPages();
    } catch (err) {
      toast.error("Couldn't delete page", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [page, loadPages]);

  // ── Restore version ───────────────────────────────────────────────────
  const restoreVersion = useCallback(
    async (version: number) => {
      if (!page) return;
      if (!confirm(`Restore version ${version}? This creates a new version with the old content.`)) return;
      try {
        const res = await fetch(
          `/api/wiki/pages/${encodeURIComponent(page.slug)}/history?circleId=${encodeURIComponent(circleId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore", version, author: me }),
          },
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || "failed to restore");
        }
        toast.success(`Restored version ${version}`);
        await loadPage(page.slug);
        await loadPages();
        setDiffVersion(null);
      } catch (err) {
        toast.error("Couldn't restore", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [page, circleId, me, loadPage, loadPages],
  );

  // ── Derived diff ──────────────────────────────────────────────────────
  const diffLines = useMemo(() => {
    if (!page || diffVersion === null) return [];
    const target = history.find((h) => h.version === diffVersion);
    if (!target) return [];
    return lineDiff(target.content, editContent);
  }, [page, history, diffVersion, editContent]);

  const previewHtml = useMemo(() => renderMarkdown(editContent), [editContent]);

  // ── Circle switcher ───────────────────────────────────────────────────
  const onCircleChange = (id: string) => {
    const c = circles.find((x) => x.id === id);
    setCircleId(id);
    setCircleName(c?.name || id);
    setSelectedSlug(null);
    setPage(null);
    setHistory([]);
  };

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Knowledge Wiki — collaborative Markdown wikis for your Circles. Version history included."
    >
      {/* Aurora background — brand palette only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/40 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight flex items-center gap-2">
              Knowledge Wiki
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/15 text-secondary border-secondary/40">
                IPFS-backed · Versioned
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {circleName} · Markdown wikis for your Circle · full version history
            </p>
          </div>

          {/* Circle switcher */}
          <select
            value={circleId}
            onChange={(e) => onCircleChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs max-w-[180px]"
            aria-label="Switch Circle"
          >
            {circlesLoading ? (
              <option>Loading…</option>
            ) : (
              circles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.avatarInitials} {c.name}
                </option>
              ))
            )}
          </select>

          <button
            onClick={() => {
              loadPages();
              if (selectedSlug) loadPage(selectedSlug);
            }}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ───────────────────────── Body: 3-pane layout ───────────────── */}
      <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 pb-24 z-10 grid grid-cols-1 md:grid-cols-[200px_1fr_220px] gap-3 lg:gap-4 min-h-0">
        {/* ─── Left: Page list ─── */}
        <aside className="md:h-[calc(100vh-180px)] md:overflow-y-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Pages
            </h2>
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="w-6 h-6 rounded-full hover:bg-muted/60 flex items-center justify-center"
              aria-label="New page"
              title="New page"
            >
              <Plus className="w-4 h-4 text-secondary" />
            </button>
          </div>

          {showNewForm && (
            <div className="mb-3 space-y-2 p-2 rounded-lg border border-border/60 bg-background/60">
              <Input
                value={newPage.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setNewPage((f) => ({ ...f, title, slug: f.slug || slugify(title) }));
                }}
                placeholder="Page title"
                className="h-8 text-xs"
              />
              <Input
                value={newPage.slug}
                onChange={(e) =>
                  setNewPage((f) => ({ ...f, slug: slugify(e.target.value) }))
                }
                placeholder="slug"
                className="h-8 text-xs font-mono"
              />
              <button
                onClick={createPage}
                disabled={creating || !newPage.title.trim()}
                className="w-full px-2 py-1 rounded-md bg-gradient-hero text-cream text-[11px] font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create
              </button>
            </div>
          )}

          {pagesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-secondary" />
            </div>
          ) : pages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-4 text-center">
              No pages yet. Click + to start one.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedSlug(p.slug)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-md text-xs transition flex items-center gap-1.5",
                      p.slug === selectedSlug
                        ? "bg-secondary/15 text-secondary font-medium"
                        : "hover:bg-muted/60 text-foreground",
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ─── Center: Editor + Preview ─── */}
        <section className="md:h-[calc(100vh-180px)] md:overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col">
          {pageLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            </div>
          ) : !page ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-6">
              <BookOpen className="w-8 h-8 text-secondary" />
              <p className="text-sm font-medium text-foreground">No page selected</p>
              <p className="text-[11px] text-center max-w-xs">
                Pick a page from the left, or click + to start a new wiki page in {circleName}.
              </p>
            </div>
          ) : (
            <>
              {/* Page header */}
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      setDirty(true);
                    }}
                    className="h-7 text-sm font-display font-semibold border-transparent bg-transparent hover:border-input focus-visible:border-input px-1"
                    placeholder="Page title"
                  />
                  <div className="text-[10px] text-muted-foreground px-1 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-mono">/{page.slug}</span>
                    <span>·</span>
                    <span>v{page.version}</span>
                    <span>·</span>
                    <span>by @{page.author}</span>
                    {page.ipfsHash && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-secondary">
                          <ExternalLink className="w-3 h-3" />
                          ipfs://{page.ipfsHash.slice(0, 12)}…
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition",
                      showPreview ? "bg-secondary/15 text-secondary" : "hover:bg-muted/60 text-muted-foreground",
                    )}
                    aria-label="Toggle preview"
                    title="Toggle preview"
                  >
                    {showPreview ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={deletePage}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent/15 text-muted-foreground hover:text-accent"
                    aria-label="Delete page"
                    title="Delete page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={savePage}
                    disabled={!dirty || saving}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Editor + preview */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
                <div className="border-r border-border/40 min-h-0 flex flex-col">
                  <Textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      setDirty(true);
                    }}
                    className="flex-1 rounded-none border-0 resize-none font-mono text-[12px] leading-relaxed bg-transparent focus-visible:ring-0 min-h-[300px] lg:min-h-0"
                    placeholder="# Page title\n\nWrite your wiki in Markdown…"
                    spellCheck={false}
                  />
                </div>
                {showPreview && (
                  <div className="min-h-0 overflow-y-auto p-4 prose-cirkle max-w-none text-sm">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                )}
              </div>

              {/* Dirty indicator */}
              {dirty && (
                <div className="px-4 py-1.5 border-t border-border/60 bg-amber-500/5 text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes — press Save to commit a new version.
                </div>
              )}
            </>
          )}
        </section>

        {/* ─── Right: Version history ─── */}
        <aside className="md:h-[calc(100vh-180px)] md:overflow-y-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-3">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            History
          </h2>

          {!page ? (
            <p className="text-[11px] text-muted-foreground py-4 text-center">
              Select a page to see its history.
            </p>
          ) : historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-secondary" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-4 text-center">
              No history yet.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Versions list (newest first) */}
              <ul className="space-y-1">
                {[...history].reverse().map((h) => {
                  const isCurrent = h.version === page.version;
                  const isDiff = diffVersion === h.version;
                  return (
                    <li key={h.id}>
                      <button
                        onClick={() => setDiffVersion(isDiff ? null : h.version)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-md text-[11px] transition",
                          isDiff
                            ? "bg-secondary/15 text-secondary"
                            : isCurrent
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "hover:bg-muted/60 text-foreground",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">v{h.version}</span>
                          {isCurrent && (
                            <span className="text-[9px] uppercase tracking-wider">current</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          @{h.author} · {timeAgo(h.createdAt)}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Diff view */}
              {diffVersion !== null && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">
                      Diff v{diffVersion} → current
                    </span>
                    <button
                      onClick={() => restoreVersion(diffVersion)}
                      className="px-2 py-1 rounded-md text-[10px] bg-muted hover:bg-muted/70 flex items-center gap-1"
                      title="Restore this version"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/60 max-h-64 overflow-y-auto">
                    {diffLines.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground p-2">No differences.</p>
                    ) : (
                      <pre className="text-[10px] font-mono leading-relaxed">
                        {diffLines.map((l, i) => (
                          <div
                            key={i}
                            className={cn(
                              "px-2",
                              l.type === "add" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                              l.type === "del" && "bg-accent/10 text-accent",
                            )}
                          >
                            <span className="opacity-50 select-none">
                              {l.type === "add" ? "+" : l.type === "del" ? "-" : " "}
                            </span>
                            {l.text || " "}
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </OverlayShell>
  );
}
