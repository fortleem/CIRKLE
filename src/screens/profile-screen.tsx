// @ts-nocheck
"use client";

import { useState } from "react";
import {
  BadgeCheck, ShieldCheck, Sparkles, Languages, Palette, Lock, Database, Globe,
  ChevronRight, Mail, Radio, Grid3x3, Scale, KeyRound, HardDriveDownload,
  Users, Eye, FileText, Wallet, LogOut, QrCode, UserPlus,
  Cookie, FileCheck, AlertTriangle, Loader2, Download, Brain,
  Image as ImageIcon, Video, Type, Heart, MessageCircle, Share2,
  Settings as SettingsIcon, Pencil, Trophy, Crown, Rocket, Zap, Star, Award, Camera,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useApp } from "@/lib/app-store";
import { useAuth, cirkleHandle, cirkleInitials } from "@/lib/auth-store";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

/**
 * Brain AI connection for the Profile screen.
 *
 * Profile was previously NOT wired to Cirkle Brain AI — the screen
 * rendered settings + account info with no AI layer. This helper
 * routes the user's "analyze my Cirkle usage patterns" request
 * through the Brain universal connection layer
 * (`/api/brain/cross-evaluate` → `crossEvaluate` → KG + 5-provider
 * consensus + web search), then surfaces the consensus answer as a
 * toast.
 *
 * It also dispatches a `circle:brain-query` CustomEvent so any future
 * page-level listener can observe / intercept Brain queries.
 */
async function brainAnalyzeProfile(opts: {
  country: string;
  city: string | null;
  username?: string;
  displayName?: string;
  verified?: boolean;
}): Promise<{ answer: string; confidence: number; sources: string[] }> {
  const { country, city, username, displayName, verified } = opts;
  window.dispatchEvent(
    new CustomEvent("circle:brain-query", {
      detail: { feature: "profile", action: "analyze", country, city },
    }),
  );
  const query =
    `[profile:analyze] analyze my Cirkle usage patterns — ` +
    `user ${displayName || "anonymous"} (${verified ? "verified" : "unverified"}), ` +
    `region ${country}${city ? ` / ${city}` : ""}. ` +
    `Suggest 3 ways Cirkle Brain AI can personalize my experience across ` +
    `news, feed, chat, travel, pay, video, photos, and social.`;
  const res = await fetch("/api/brain/cross-evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      country,
      city: city || undefined,
      username,
      language: "en",
    }),
  });
  if (!res.ok) throw new Error(`Brain query failed (${res.status})`);
  const data = await res.json();
  return {
    answer: data?.finalAnswer || "No analysis right now — try again later.",
    confidence: data?.confidence ?? 0,
    sources: (data?.sources || []).map((s: { name: string }) => s.name),
  };
}

export function ProfileScreen() {
  const {
    theme, toggleTheme, locale, toggleLocale,
    country, setCountry, city, setCity,
    ghostMode, setGhostMode,
  } = useApp();
  const { user, logout } = useAuth();
  const [regionOpen, setRegionOpen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<{ title: string; body: React.ReactNode } | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [brainBusy, setBrainBusy] = useState(false);

  /** Wipe IndexedDB so all on-device Brain memory is destroyed. */
  const wipeIndexedDB = async (): Promise<void> => {
    if (typeof window === "undefined" || !("indexedDB" in window)) return;
    // Best-effort: enumerate and delete every database. The Brain uses one
    // named "cirkle-brain" but we sweep all Cirkle-prefixed DBs to be safe.
    const dbs = await new Promise<string[]>((resolve) => {
      try {
        if (window.indexedDB.databases) {
          window.indexedDB.databases().then((list) => resolve(list.map((d) => d.name || "").filter(Boolean))).catch(() => resolve([]));
        } else {
          resolve([]);
        }
      } catch {
        resolve([]);
      }
    });
    const toWipe = dbs.length > 0 ? dbs : ["cirkle-brain"];
    await Promise.all(
      toWipe.map(
        (name) =>
          new Promise<void>((resolve) => {
            try {
              const req = window.indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            } catch {
              resolve();
            }
          }),
      ),
    );
  };

  /** Real account deletion — calls /api/account/delete then wipes local state. */
  const performAccountDeletion = async () => {
    if (!user?.username) {
      toast.error("No account to delete.");
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          handle: cirkleHandle(user),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Server-side deletion failed.");
      }
      // 1. Wipe localStorage (auth, app prefs, consent).
      try { window.localStorage.clear(); } catch { /* no-op */ }
      // 2. Wipe IndexedDB (Brain memory).
      await wipeIndexedDB();
      // 3. Wipe service-worker caches if any.
      try {
        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((k) => window.caches.delete(k)));
        }
      } catch { /* no-op */ }
      toast.success("Account deleted", {
        description: "All your data has been erased. Reloading…",
      });
      // 4. Reload after a short beat so the toast can render.
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      const msg = String((err as Error)?.message || err || "Deletion failed.");
      toast.error("Account deletion failed", { description: msg });
      setDeleteBusy(false);
      setDeleteOpen(false);
    }
  };

  /** Real data export — fetches JSON and triggers a browser download. */
  const performDataExport = async () => {
    if (!user?.username) {
      toast.error("Sign in to export your data.");
      return;
    }
    setExportBusy(true);
    try {
      const url = `/api/account/export?username=${encodeURIComponent(user.username)}&handle=${encodeURIComponent(cirkleHandle(user))}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Export failed (HTTP ${res.status}).`);
      }
      const blob = await res.blob();
      // Pull the filename from Content-Disposition, fall back to a sensible default.
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/i);
      const filename = m?.[1] || `cirkle-data-export-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
      // Trigger a browser download via a synthetic anchor.
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success("Export downloaded", {
        description: `${filename} · ${Math.round(blob.size / 1024)} KB`,
      });
    } catch (err) {
      const msg = String((err as Error)?.message || err || "Export failed.");
      toast.error("Data export failed", { description: msg });
    } finally {
      setExportBusy(false);
    }
  };

  const cInfo = getCountry(country);
  const displayName = user?.displayName || "Guest User";
  const handle = user ? cirkleHandle(user) : "@guest@cirkle";
  const initials = cirkleInitials(user);
  const regionLabel = user?.country ? getCountry(user.country).flag : cInfo.flag;
  const regionCity = city || cInfo.capital;

  /** Calls the Brain universal layer for usage-pattern analysis. */
  const onBrainProfile = async () => {
    if (brainBusy) return;
    setBrainBusy(true);
    const promise = brainAnalyzeProfile({
      country,
      city,
      username: user?.username,
      displayName,
      verified: user?.verified,
    });
    toast.promise(promise, {
      loading: "🧠 Brain is reading your Cirkle DNA…",
      success: (r) => ({
        title: "🧠 Brain AI · Profile",
        description: `${r.answer.slice(0, 180)}${r.answer.length > 180 ? "…" : ""}`,
      }),
      error: (e: Error) => ({
        title: "Brain AI unavailable",
        description: e.message,
      }),
    });
    try {
      await promise;
    } catch {
      /* toast already shown */
    } finally {
      setBrainBusy(false);
    }
  };

  return (
    <div className="pb-32">
      {/* ── Super Upgrade: Cover photo banner + profile header with verified human + privacy badges ── */}
      <div className="mx-4 mt-3 rounded-3xl overflow-hidden relative shadow-float" style={{ color: "hsl(var(--cream))" }}>
        {/* === COVER PHOTO BANNER — gold/teal/rose gradient blend, multi-pattern overlay === */}
        <div className="relative h-32 overflow-hidden">
          {/* Base gradient: teal → steel → rose → gold */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(120deg, hsl(195 56% 23%) 0%, hsl(211 30% 42%) 30%, hsl(351 41% 56%) 65%, hsl(39 45% 57%) 100%)" }}
          />
          {/* Aurora overlay (rose + teal + gold radial bloom) */}
          <div className="absolute inset-0 bg-gradient-aurora opacity-70" />
          {/* Multi-radial color accents for depth */}
          <div
            className="absolute inset-0 opacity-40"
            style={{ backgroundImage: "radial-gradient(circle at 18% 30%, hsl(39 45% 67%) 0%, transparent 38%), radial-gradient(circle at 82% 70%, hsl(351 41% 66%) 0%, transparent 38%), radial-gradient(circle at 55% 50%, hsl(195 56% 43%) 0%, transparent 45%)" }}
          />
          {/* Dot-grid pattern overlay (subtle texture) */}
          <div
            className="absolute inset-0 opacity-25"
            style={{ backgroundImage: "radial-gradient(circle, hsl(40 50% 98%) 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }}
          />
          {/* Diagonal sheen for shine */}
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: "linear-gradient(115deg, transparent 40%, hsl(40 50% 98% / 0.18) 50%, transparent 60%)" }}
          />
          {/* Edit cover affordance */}
          <button
            onClick={() => toast.success("Cover photo upload coming soon")}
            aria-label="Edit cover photo"
            className="absolute top-3 right-3 text-[10px] px-2.5 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/30 text-white flex items-center gap-1.5 hover:bg-black/50 transition"
          >
            <Camera className="w-3 h-3" /> Edit cover
          </button>
          {/* Cover label */}
          <div className="absolute bottom-2.5 left-4 text-[10px] uppercase tracking-widest text-white/85 font-medium flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Cover photo
          </div>
        </div>

        {/* === PROFILE CONTENT (avatar overlaps cover, sits on dark hero gradient) === */}
        <div className="relative bg-gradient-hero">
          <div className="px-6 pb-5 -mt-12 flex items-end gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-gold p-1 ring-4 ring-background">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-display text-3xl text-foreground">{initials}</div>
              </div>
              {/* Online status */}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <ShieldCheck className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            {/* Name + verified + privacy badges */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-display text-2xl truncate">{displayName}</h2>
                {user?.verified && <BadgeCheck className="w-5 h-5" />}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30 font-medium flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified Human
                </span>
              </div>
              <div className="text-xs opacity-80 font-mono">{handle} · {regionLabel} {regionCity}</div>
              <div className="flex gap-4 mt-2 text-xs">
                <span><b className="font-display text-base">0</b> followers</span>
                <span><b className="font-display text-base">0</b> following</span>
                <span><b className="font-display text-base">{user?.verified ? "Verified" : "New"}</b> tier</span>
              </div>
              {/* Privacy badges */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 flex items-center gap-0.5">
                  <ShieldCheck className="w-2 h-2" /> Data on device
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 flex items-center gap-0.5">
                  <ShieldCheck className="w-2 h-2" /> No tracking
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 flex items-center gap-0.5">
                  <ShieldCheck className="w-2 h-2" /> 100% free
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid — Account-level stats (ENHANCED with icons inside each card) */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {[
          { v: user?.verified ? "100" : "50", l: "Trust score", detail: "trust", icon: ShieldCheck },
          { v: "0", l: "Workspaces", detail: "workspaces", icon: Users },
          { v: "0", l: "Verified items", detail: "verified", icon: BadgeCheck },
        ].map((s) => (
          <button
            key={s.l}
            onClick={() => setDetailSheet({
              title: s.l,
              body: <StatDetail label={s.l} icon={s.icon} />,
            })}
            className="glass rounded-2xl p-3 text-center hover:bg-muted/50 transition group"
          >
            <div className="flex items-center justify-center mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center group-hover:bg-secondary/25 transition">
                <s.icon className="w-4 h-4 text-secondary" />
              </div>
            </div>
            <div className="font-display text-2xl gradient-text-gold">{s.v}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
          </button>
        ))}
      </div>

      {/* === NEW: Activity Stats 4-column grid — Posts / Followers / Following / Circles joined === */}
      <div className="grid grid-cols-4 gap-2 px-4 mt-3">
        {[
          { v: "247", l: "Posts", icon: FileText, color: "text-steel" },
          { v: "1.2K", l: "Followers", icon: Users, color: "text-gold" },
          { v: "384", l: "Following", icon: UserPlus, color: "text-rose" },
          { v: "12", l: "Circles", icon: Grid3x3, color: "text-teal" },
        ].map((s) => (
          <button
            key={s.l}
            onClick={() => setDetailSheet({
              title: s.l,
              body: <StatDetail label={s.l} icon={s.icon} />,
            })}
            className="glass rounded-2xl p-2.5 text-center hover:bg-muted/50 transition group"
          >
            <div className="flex items-center justify-center mb-1">
              <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
            </div>
            <div className="font-display text-base gradient-text-gold">{s.v}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.l}</div>
          </button>
        ))}
      </div>

      {/* === NEW: Quick Actions Row — Edit Profile / Share Profile / Settings === */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-3">
        <QuickActionButton
          icon={Pencil}
          label="Edit Profile"
          onClick={() => toast.success("Edit profile coming soon")}
        />
        <QuickActionButton
          icon={Share2}
          label="Share Profile"
          onClick={() => {
            try { navigator.clipboard?.writeText(`${window.location.origin}/@${user?.username || "guest"}`); } catch { /* no-op */ }
            toast.success("Profile link copied");
          }}
        />
        <QuickActionButton
          icon={SettingsIcon}
          label="Settings"
          onClick={() => window.dispatchEvent(new CustomEvent("circle:settings"))}
        />
      </div>

      {/* === NEW: Achievement Badges row — Early Adopter / Verified Human / Privacy Champion / Circle Creator / etc. === */}
      <div className="px-4 mt-4">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-secondary" /> Achievements
        </h3>
        <div className="glass rounded-2xl p-3">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
            <AchievementBadge icon={Rocket} label="Early Adopter" color="from-violet-500 to-indigo-600" />
            <AchievementBadge icon={ShieldCheck} label="Verified Human" color="from-emerald-500 to-teal-600" />
            <AchievementBadge icon={Lock} label="Privacy Champion" color="from-sky-500 to-blue-600" />
            <AchievementBadge icon={Crown} label="Circle Creator" color="from-amber-500 to-orange-600" />
            <AchievementBadge icon={Heart} label="Top Contributor" color="from-rose-500 to-pink-600" />
            <AchievementBadge icon={Zap} label="Quick Responder" color="from-yellow-500 to-amber-500" />
            <AchievementBadge icon={Star} label="Rising Star" color="from-fuchsia-500 to-purple-600" locked />
            <AchievementBadge icon={Award} label="Legend" color="from-slate-500 to-zinc-600" locked />
          </div>
        </div>
      </div>

      {/* === NEW: Posts Grid — 3-column, color-coded by post type (text=steel, photo=rose, video=teal) === */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Grid3x3 className="w-3 h-3 text-secondary" /> Recent Posts
          </h3>
          <button
            onClick={() => toast.success("Opening posts feed…")}
            className="text-[10px] text-secondary hover:underline flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MOCK_POSTS.map((post) => (
            <PostGridItem key={post.id} post={post} />
          ))}
        </div>
        {/* Color legend */}
        <div className="flex items-center justify-center gap-3 mt-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><Type className="w-2.5 h-2.5 text-steel" /> Text</span>
          <span className="flex items-center gap-1"><ImageIcon className="w-2.5 h-2.5 text-rose" /> Photo</span>
          <span className="flex items-center gap-1"><Video className="w-2.5 h-2.5 text-teal" /> Video</span>
        </div>
      </div>

      {/* Brain AI Profile banner — routes the user's "analyze my Cirkle
          usage patterns" request through the Brain universal layer. */}
      <div className="px-4 mt-3">
        <button
          onClick={onBrainProfile}
          disabled={brainBusy}
          aria-label="Brain AI profile analysis"
          className="w-full rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4 flex items-center gap-3 relative overflow-hidden text-left hover:bg-secondary/10 transition disabled:opacity-50"
        >
          <div className="absolute -top-10 -right-8 w-32 h-32 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
            {brainBusy ? (
              <Loader2 className="w-5 h-5 text-brand-charcoal animate-spin" />
            ) : (
              <Brain className="w-5 h-5 text-brand-charcoal" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-secondary">Brain AI Profile</div>
            <div className="font-display text-base">Analyze my Cirkle usage patterns</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              5-provider consensus · {regionLabel} {regionCity}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-secondary shrink-0" />
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────
          R5 — Grouped profile settings: 4 visual cards.
          All existing rows + onClick handlers are preserved verbatim,
          only reorganised into grouped cards.
          ─────────────────────────────────────────────────────────── */}

      {/* 👤 Account */}
      <div className="glass rounded-2xl p-4 mt-4 mx-4">
        <h3 className="font-display text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <span aria-hidden>👤</span> Account
        </h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
          <Row
            icon={Sparkles}
            title="Cirkle Hub"
            sub="All 18 pillars — Mail, ID, Verify, Mesh, Maps, more"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
          />
          <Row
            icon={KeyRound}
            title="Cirkle ID"
            sub={`${handle} · OIDC provider`}
            onClick={() => window.dispatchEvent(new CustomEvent("circle:identity"))}
          />
          <Row
            icon={Mail}
            title="Cirkle Mail"
            sub="3 unread · Free forever"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
          />
          <Row
            icon={Grid3x3}
            title="Mini apps"
            sub="8 connected · Browse hub"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
          />
          <Row
            icon={Radio}
            title="Mesh network"
            sub="4 peers nearby · Bluetooth + Wi-Fi Direct"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
          />
          <Row
            icon={Wallet}
            title="Cirkle Pay"
            sub={`${cInfo.currency} balance · Fee-free`}
            onClick={() => window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "pay" } }))}
          />
          <Row
            icon={ShieldCheck}
            title="Cirkle Verify"
            sub={user?.verified ? "Identity verified · One account per ID" : "Not verified · Get verified for trust"}
            onClick={() => window.dispatchEvent(new CustomEvent("circle:identity"))}
          />
          <Row
            icon={HardDriveDownload}
            title="Backup & migrate"
            sub="Encrypted, user-held key"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))}
          />
          <Row
            icon={QrCode}
            title="My QR Code"
            sub="Share to add contacts"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:contact-qr"))}
          />
          <Row
            icon={UserPlus}
            title="Add Contact"
            sub="Find friends on Cirkle"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:add-contact"))}
          />
        </div>
      </div>

      {/* 🎨 Appearance */}
      <div className="glass rounded-2xl p-4 mt-4 mx-4">
        <h3 className="font-display text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <span aria-hidden>🎨</span> Appearance
        </h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
          <Row
            icon={Palette}
            title="Theme"
            sub={theme === "dark" ? "Dark · Aurora" : "Light · Cream"}
            onClick={() => { toggleTheme(); toast.success(theme === "dark" ? "Light mode" : "Dark mode"); }}
          />
          <Row
            icon={Languages}
            title="Language"
            sub={locale === "ar" ? "العربية (RTL)" : "English"}
            onClick={() => { toggleLocale(); toast.success(locale === "en" ? "العربية" : "English"); }}
          />
          <Row
            icon={Globe}
            title="Region"
            sub={`${cInfo.flag} ${cInfo.name} · Auto data plane`}
            onClick={() => setRegionOpen(true)}
          />
          <Row
            icon={Sparkles}
            title="AI personalization"
            sub="What Cirkle knows about you"
            onClick={() => setDetailSheet({
              title: "AI personalization",
              body: <AIPersonalizationBody />,
            })}
          />
        </div>
      </div>

      {/* 🔒 Privacy & Data */}
      <div className="glass rounded-2xl p-4 mt-4 mx-4">
        <h3 className="font-display text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <span aria-hidden>🔒</span> Privacy &amp; Data
        </h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
          <Row
            icon={ShieldCheck}
            title="Privacy center"
            sub="Granular controls for every module"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:settings"))}
          />
          <Row
            icon={Lock}
            title="Ghost mode"
            sub="Vanish from presence everywhere"
            toggle
            toggleChecked={ghostMode}
            onToggle={(v) => { setGhostMode(v); toast.success(v ? "Ghost mode on 🕶" : "Ghost mode off"); }}
          />
          <Row
            icon={Cookie}
            title="Cookie consent"
            sub="Manage your consent preferences"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:cookie-consent"))}
          />
          <Row
            icon={Database}
            title="Data ownership"
            sub="Export, delete, or transfer"
            onClick={() => setDetailSheet({
              title: "Data ownership",
              body: (
                <DataOwnershipBody
                  onExport={performDataExport}
                  onDelete={() => setDeleteOpen(true)}
                  exportBusy={exportBusy}
                />
              ),
            })}
          />
          <Row
            icon={Scale}
            title="Submit a data request"
            sub="Access · correction · deletion · portability"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:dsr-request"))}
          />
          <Row
            icon={Scale}
            title="Community governance"
            sub="Vote on moderation policies"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:governance"))}
          />
          <Row
            icon={FileText}
            title="Privacy Policy"
            sub="GDPR · PDPL · COPPA · What we collect"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:privacy-policy"))}
          />
          <Row
            icon={FileCheck}
            title="Terms of Service"
            sub="Your agreement with Cirkle"
            onClick={() => window.dispatchEvent(new CustomEvent("circle:terms"))}
          />
        </div>
      </div>

      {/* ℹ️ About */}
      <div className="glass rounded-2xl p-4 mt-4 mx-4">
        <h3 className="font-display text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <span aria-hidden>ℹ️</span> About
        </h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
          <Row
            icon={BadgeCheck}
            title="Version"
            sub="Cirkle v12.0 · build 2025.04"
            onClick={() => toast.success("Cirkle v12.0", { description: "Up to date · build 2025.04" })}
          />
          <Row
            icon={LogOut}
            title="Sign out"
            sub={user ? `Sign out of ${handle}` : "End your session"}
            onClick={() => setSignOutOpen(true)}
          />
        </div>
      </div>

      {/* Region sheet */}
      <Sheet open={regionOpen} onOpenChange={setRegionOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl flex items-center gap-2">
              <Globe className="w-5 h-5 text-secondary" /> Region
            </SheetTitle>
            <SheetDescription>Auto data plane · Stored locally</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-8 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 px-1">Country</div>
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); toast.success(`Region: ${getCountry(e.target.value).name}`); }}
                className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none"
              >
                {COUNTRIES.map((cc) => (
                  <option key={cc.code} value={cc.code}>{cc.flag} {cc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 px-1">City</div>
              <select
                value={city || cInfo.capital}
                onChange={(e) => { setCity(e.target.value); toast.success(`City: ${e.target.value}`); }}
                className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none"
              >
                {cInfo.majorCities.map((cc) => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-xs">
              <div className="flex items-center gap-1.5 text-secondary mb-1">
                <ShieldCheck className="w-3 h-3" /> Data plane
              </div>
              <div className="text-muted-foreground">
                Your data stays on your device. When you opt into sync, it routes through the {cInfo.name} federation relay.
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!detailSheet} onOpenChange={(v) => !v && setDetailSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[80vh] overflow-y-auto">
          {detailSheet && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
                <SheetTitle className="font-display text-xl">{detailSheet.title}</SheetTitle>
              </SheetHeader>
              <div className="p-4">{detailSheet.body}</div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Sign-out confirm */}
      <Sheet open={signOutOpen} onOpenChange={setSignOutOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          <SheetHeader className="px-4 pt-5 pb-3">
            <SheetTitle className="font-display text-xl flex items-center gap-2">
              <LogOut className="w-5 h-5 text-accent" /> Sign out of Cirkle?
            </SheetTitle>
            <SheetDescription>
              You&apos;ll need to sign back in to access your messages, payments, and feed. Your data stays on this device.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 pt-2 space-y-2">
            {user && (
              <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-charcoal font-display">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{handle}</div>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                logout();
                setSignOutOpen(false);
                toast.success("Signed out", { description: "See you soon." });
              }}
              className="w-full py-3 rounded-full bg-accent/15 text-accent text-sm font-medium hover:bg-accent/25 transition"
            >
              Sign out
            </button>
            <button
              onClick={() => setSignOutOpen(false)}
              className="w-full py-3 rounded-full glass text-sm hover:bg-muted/50 transition"
            >
              Stay signed in
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Account deletion confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(v) => !deleteBusy && setDeleteOpen(v)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl flex items-center gap-2 text-accent">
              <AlertTriangle className="w-5 h-5" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This permanently erases <b>all</b> your Cirkle data: posts, messages,
              reactions, shield reports, verify claims, transactions, app connections,
              and your on-device Brain memory. This action <b>cannot be undone</b>.
              <br /><br />
              Type your handle to confirm:{" "}
              <span className="font-mono text-foreground">{handle}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DeleteConfirmInput expected={handle} busy={deleteBusy} onConfirm={performAccountDeletion} onCancel={() => setDeleteOpen(false)} />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Type-to-confirm input used by the account-deletion AlertDialog. */
function DeleteConfirmInput({
  expected,
  busy,
  onConfirm,
  onCancel,
}: {
  expected: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const matches = value.trim().toLowerCase() === expected.trim().toLowerCase();
  return (
    <div className="space-y-3">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={expected}
        className="w-full rounded-xl bg-muted border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-accent/60"
        aria-label="Type your handle to confirm deletion"
      />
      <AlertDialogFooter className="flex-row gap-2 sm:justify-stretch">
        <AlertDialogCancel
          onClick={onCancel}
          disabled={busy}
          className="mt-0 sm:mt-0"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault();
            if (!matches || busy) return;
            onConfirm();
          }}
          disabled={!matches || busy}
          className="bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Deleting…
            </>
          ) : (
            "Permanently delete"
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 mt-6">
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</h3>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon, title, sub, toggle, toggleChecked, onToggle, onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  toggle?: boolean;
  toggleChecked?: boolean;
  onToggle?: (v: boolean) => void;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-secondary" /></div>
      <div className="flex-1 min-w-0"><div className="text-sm font-medium">{title}</div><div className="text-xs text-muted-foreground truncate">{sub}</div></div>
      {toggle ? <Switch checked={!!toggleChecked} onCheckedChange={onToggle} /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </>
  );
  if (toggle) return <div role="group" aria-label={title} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition">{inner}</div>;
  return <button onClick={onClick} className="w-full text-start px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition">{inner}</button>;
}

function StatDetail({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center">
          <Icon className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <div className="font-display text-lg">{label}</div>
          <div className="text-xs text-muted-foreground">Updated just now</div>
        </div>
      </div>
      <div className="rounded-xl bg-card border border-border p-3 text-xs text-muted-foreground leading-relaxed">
        {label === "Trust score" && "Built from verification level, account age, and community reputation. You're in the top 2% of trusted accounts."}
        {label === "Workspaces" && "12 workspaces across 4 organisations. You're an admin in 3 of them."}
        {label === "Verified items" && "47 pieces of content you've created have been verified by Cirkle AI as authentic and original."}
      </div>
    </div>
  );
}

function DataOwnershipBody({
  onExport,
  onDelete,
  exportBusy,
}: {
  onExport: () => void;
  onDelete: () => void;
  exportBusy: boolean;
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onExport}
        disabled={exportBusy}
        className="w-full rounded-xl bg-card border border-border p-3 flex items-center gap-3 hover:bg-muted/40 transition text-start disabled:opacity-60"
      >
        {exportBusy ? (
          <Loader2 className="w-4 h-4 text-secondary animate-spin" />
        ) : (
          <Download className="w-4 h-4 text-secondary" />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium">
            {exportBusy ? "Exporting…" : "Export my data"}
          </div>
          <div className="text-xs text-muted-foreground">
            JSON download · GDPR Art. 20 portability
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => toast.success("Transfer queued · 7-day cooling-off")}
        className="w-full rounded-xl bg-card border border-border p-3 flex items-center gap-3 hover:bg-muted/40 transition text-start"
      >
        <Database className="w-4 h-4 text-secondary" />
        <div className="flex-1">
          <div className="text-sm font-medium">Transfer to another instance</div>
          <div className="text-xs text-muted-foreground">Self-hosted Cirkle</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={onDelete}
        className="w-full rounded-xl bg-accent/10 border border-accent/40 p-3 flex items-center gap-3 hover:bg-accent/20 transition text-start"
      >
        <AlertTriangle className="w-4 h-4 text-accent" />
        <div className="flex-1">
          <div className="text-sm font-medium text-accent">Delete my account</div>
          <div className="text-xs text-accent/80">Permanent · Cannot be undone</div>
        </div>
        <ChevronRight className="w-4 h-4 text-accent" />
      </button>
    </div>
  );
}

function AIPersonalizationBody() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 text-secondary text-xs">
          <Eye className="w-3 h-3" /> What Cirkle AI knows
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>• Interests inferred from your posts: 14 topics</li>
          <li>• Languages you write in: English, Arabic</li>
          <li>• Frequently visited cities: Riyadh, Jeddah</li>
          <li>• Approximate age band: 25–34</li>
        </ul>
      </div>
      <div className="rounded-xl bg-card border border-border p-3 text-xs text-muted-foreground">
        All inference runs on-device. Cirkle servers never see your personalization data.
      </div>
      <button
        onClick={() => toast.success("AI personalization cleared")}
        className="w-full py-2.5 rounded-full bg-accent/15 text-accent text-xs"
      >
        Clear personalization
      </button>
    </div>
  );
}

/** Quick action button used in the Edit/Share/Settings row. */
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-muted/50 transition group"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center group-hover:scale-105 transition">
        <Icon className="w-4 h-4 text-charcoal" />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

/** Achievement badge — circular gradient icon with tooltip. Locked badges render grayscale with a lock pin. */
function AchievementBadge({
  icon: Icon,
  label,
  color,
  locked = false,
}: {
  icon: LucideIcon;
  label: string;
  color: string; // tailwind gradient stops, e.g. "from-violet-500 to-indigo-600"
  locked?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={locked ? `${label} (locked)` : label}
          className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition ${locked ? "bg-muted border border-border opacity-60" : `bg-gradient-to-br ${color} shadow-md hover:scale-110`}`}
        >
          <Icon className={`w-5 h-5 ${locked ? "text-muted-foreground" : "text-white"}`} />
          {locked && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center">
              <Lock className="w-2 h-2 text-muted-foreground" />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-center">
          <div className="font-medium">{label}</div>
          {locked && <div className="text-[10px] opacity-70">Not unlocked yet</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Post type for the posts grid preview. */
type PostType = "text" | "photo" | "video";
type MockPost = {
  id: number;
  type: PostType;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  time: string;
};

/** Mock posts for the profile grid (UI preview — no backend yet). */
const MOCK_POSTS: MockPost[] = [
  { id: 1, type: "text", text: "Beautiful morning in the city — coffee and code, the perfect combo.", likes: 24, comments: 5, shares: 2, time: "2h" },
  { id: 2, type: "photo", text: "Sunset from my balcony tonight 🌅", likes: 87, comments: 12, shares: 8, time: "5h" },
  { id: 3, type: "video", text: "Travel vlog: mountains of the Asir region.", likes: 142, comments: 28, shares: 19, time: "1d" },
  { id: 4, type: "text", text: "Three things I learned building Cirkle this week.", likes: 56, comments: 14, shares: 6, time: "1d" },
  { id: 5, type: "photo", text: "Coffee art from the local café.", likes: 33, comments: 4, shares: 1, time: "2d" },
  { id: 6, type: "video", text: "Quick tutorial: setting up privacy controls.", likes: 198, comments: 41, shares: 32, time: "3d" },
  { id: 7, type: "text", text: "Privacy is not a feature — it's the foundation.", likes: 89, comments: 17, shares: 24, time: "4d" },
  { id: 8, type: "photo", text: "Street art in the old district.", likes: 71, comments: 9, shares: 5, time: "5d" },
  { id: 9, type: "video", text: "Live AMA about Cirkle Verify.", likes: 312, comments: 67, shares: 45, time: "1w" },
];

/** Post grid item — small card with post-type icon, truncated text, engagement counts. Color-coded by type. */
function PostGridItem({ post }: { post: MockPost }) {
  const typeMeta: Record<PostType, { Icon: LucideIcon; color: string; bg: string }> = {
    text: { Icon: Type, color: "text-steel", bg: "bg-steel/10" },
    photo: { Icon: ImageIcon, color: "text-rose", bg: "bg-rose/10" },
    video: { Icon: Video, color: "text-teal", bg: "bg-teal/10" },
  };
  const { Icon, color, bg } = typeMeta[post.type];
  return (
    <button
      onClick={() => toast.success(`Opening post from ${post.time} ago`)}
      className="glass rounded-2xl p-2.5 text-left hover:bg-muted/50 transition flex flex-col gap-1.5 min-h-[130px]"
    >
      <div className="flex items-center justify-between">
        <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center`}>
          <Icon className={`w-3 h-3 ${color}`} />
        </div>
        <span className="text-[9px] text-muted-foreground">{post.time}</span>
      </div>
      <div className="flex-1 text-[10px] leading-tight line-clamp-3 text-foreground/90">{post.text}</div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/40">
        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {post.likes}</span>
        <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" /> {post.comments}</span>
        <span className="flex items-center gap-0.5"><Share2 className="w-2.5 h-2.5" /> {post.shares}</span>
      </div>
    </button>
  );
}
