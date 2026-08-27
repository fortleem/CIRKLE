"use client";

import { useCallback, useState } from "react";

/**
 * Dashboard layout preferences — controls which sections are visible on the
 * Home screen, plus per-section collapsed/expanded state.
 *
 * The Home screen (src/screens/home-screen.tsx) had ~18 sections visible at
 * once, creating visual noise. This module powers the "Customize Dashboard"
 * flow: prefs gate VISIBILITY (whether a section shows at all) and
 * `collapsed` controls the per-section chevron (header-only vs. full body).
 *
 * Persisted to `localStorage["cirkle-dashboard-layout"]` so the user's
 * choices survive reloads. Falls back to defaults on first visit.
 */

export type SectionKey =
  // Main feed column (right)
  | "dailyBrief"     // AI Daily Brief — 3-line living briefing
  | "trendingBar"    // R4: scrolling Trending topics bar
  | "stories"        // R2: ephemeral Stories bar
  | "priorityShares" // Priority shares — latest from Lamahat/Mashahd/Midan
  | "sectionNav"     // Quick-jump chips (Featured / News / For You / ...)
  | "aiAsk"          // AI Ask bar (mic pill)
  | "featured"       // Featured carousel
  | "foryou"         // For You feed (incl. the "What's on your mind?" composer)
  | "quickActions"   // Compact horizontal pills (Scan & Pay / City Pulse / ...)
  | "jumpBar"        // Sticky category chips for instant scroll
  | "shield"         // Citizen Shield hero card
  | "sponsored"      // Sponsored Banner (Blueprint §5.3.8)
  | "exclusives"     // Cirkle Exclusives grid
  // Sidebar column (left)
  | "todays"         // Today's Cirkle — AI 5-bullet summary
  | "news"           // Categorized News (live web-sourced)
  | "official"       // Official Channels (collapsed quick-subscribe)
  | "foryouAi"       // For You AI (secondary 2-card grid)
  | "miniApps"       // Mini apps — open platform
  | "spaces"         // Live Spaces
  | "upcoming"       // Upcoming in your circles
  | "nearby"         // Happening Nearby
  | "trending"       // Trending (sidebar list)
  | "socialFeed"     // Social Feed (Brain AI orchestrated)
  | "workspace"      // Workspace card
  | "mailStrip"      // Cirkle ID + Mail strip
  | "covenant";      // Covenant footer

export const ALL_SECTION_KEYS: readonly SectionKey[] = [
  "dailyBrief",
  "trendingBar",
  "stories",
  "priorityShares",
  "sectionNav",
  "aiAsk",
  "featured",
  "foryou",
  "quickActions",
  "jumpBar",
  "shield",
  "sponsored",
  "exclusives",
  "todays",
  "news",
  "official",
  "foryouAi",
  "miniApps",
  "spaces",
  "upcoming",
  "nearby",
  "trending",
  "socialFeed",
  "workspace",
  "mailStrip",
  "covenant",
] as const;

/**
 * Default visibility — only 5-6 sections show by default (per the
 * UI-FIXES-1 spec). The greeting header + dock are always rendered and are
 * NOT part of this prefs model.
 *
 * Visible by default: For You feed (incl. composer), Citizen Shield hero,
 * News (collapsed to header + 2 articles). Everything else is opt-in via
 * the Customize Dashboard sheet.
 *
 * `sponsored` defaults to true so a served ad is visible when present (the
 * section is also gated on `sponsoredAd != null` at render time).
 */
export const DEFAULT_PREFS: Record<SectionKey, boolean> = {
  dailyBrief: false,
  trendingBar: false,
  stories: false,
  priorityShares: false,
  sectionNav: false,
  aiAsk: false,
  featured: false,
  foryou: true,
  quickActions: false,
  jumpBar: false,
  shield: true,
  sponsored: true,
  exclusives: false,
  todays: false,
  news: true,
  official: false,
  foryouAi: false,
  miniApps: false,
  spaces: false,
  upcoming: false,
  nearby: false,
  trending: false,
  socialFeed: false,
  workspace: false,
  mailStrip: false,
  covenant: false,
};

/**
 * Default collapsed state — News is collapsed by default (header + 2 articles
 * only). Every other visible section starts expanded.
 */
export const DEFAULT_COLLAPSED: Record<SectionKey, boolean> = {
  dailyBrief: false,
  trendingBar: false,
  stories: false,
  priorityShares: false,
  sectionNav: false,
  aiAsk: false,
  featured: false,
  foryou: false,
  quickActions: false,
  jumpBar: false,
  shield: false,
  sponsored: false,
  exclusives: false,
  todays: false,
  news: true, // collapsed by default — show header + 2 articles, expand for more
  official: false,
  foryouAi: false,
  miniApps: false,
  spaces: false,
  upcoming: false,
  nearby: false,
  trending: false,
  socialFeed: false,
  workspace: false,
  mailStrip: false,
  covenant: false,
};

export interface SectionMeta {
  key: SectionKey;
  /** Human-readable label shown in the Customize sheet. */
  label: string;
  /** Short description of what this section contains. */
  desc: string;
  /** Default column for ordering purposes ("main" = right feed, "side" = left sidebar). */
  column: "main" | "side";
}

export const SECTION_META: readonly SectionMeta[] = [
  // Main feed column
  { key: "dailyBrief",    label: "AI Daily Brief",      desc: "3-line living briefing (weather + news + suggestion)", column: "main" },
  { key: "trendingBar",   label: "Trending bar",        desc: "Scrolling trending topics strip",                     column: "main" },
  { key: "stories",       label: "Stories",             desc: "Ephemeral stories from friends",                      column: "main" },
  { key: "priorityShares",label: "Priority Shares",     desc: "Latest from Lamahat, Mashahd, Midan",                 column: "main" },
  { key: "sectionNav",    label: "Quick-jump chips",    desc: "Featured / News / For You / Spaces / Trending",       column: "main" },
  { key: "aiAsk",         label: "AI Ask bar",          desc: "Mic pill — ask Cirkle Brain anything",                column: "main" },
  { key: "featured",      label: "Featured carousel",   desc: "Hand-picked featured cards",                          column: "main" },
  { key: "foryou",        label: "For You feed",        desc: "AI-personalized feed + composer",                     column: "main" },
  { key: "quickActions",  label: "Quick actions",       desc: "Scan & Pay / City Pulse / Post / Ask AI pills",       column: "main" },
  { key: "jumpBar",       label: "Sticky jump bar",     desc: "Sticky category chips for instant scroll",            column: "main" },
  { key: "shield",        label: "Citizen Shield hero", desc: "Big glass hero card — most-used feature",             column: "main" },
  { key: "sponsored",     label: "Sponsored banner",    desc: "Local non-targeted ad (shown only when served)",      column: "main" },
  { key: "exclusives",    label: "Cirkle Exclusives",   desc: "All 12 features grid",                                column: "main" },
  // Sidebar column
  { key: "todays",        label: "Today's Cirkle",      desc: "AI 5-bullet summary of everything today",             column: "side" },
  { key: "news",          label: "News",                desc: "Live web-sourced categorized news",                   column: "side" },
  { key: "official",      label: "Official Channels",   desc: "Quick-subscribe to government / media / business",    column: "side" },
  { key: "foryouAi",      label: "For You AI",          desc: "Secondary AI-recommendation grid",                    column: "side" },
  { key: "miniApps",      label: "Mini apps",           desc: "Open platform for any mini app",                      column: "side" },
  { key: "spaces",        label: "Live Spaces",         desc: "Audio spaces happening now",                          column: "side" },
  { key: "upcoming",      label: "Upcoming in circles", desc: "Events sourced from your circles",                    column: "side" },
  { key: "nearby",        label: "Happening Nearby",    desc: "Location-based discovery cards",                      column: "side" },
  { key: "trending",      label: "Trending list",       desc: "Ranked trending topics list",                         column: "side" },
  { key: "socialFeed",    label: "Shared by Cirkle",    desc: "Brain AI orchestrated social feed",                   column: "side" },
  { key: "workspace",     label: "Workspace",           desc: "Design workspace card",                               column: "side" },
  { key: "mailStrip",     label: "Cirkle ID + Mail",    desc: "Your @cirkle identity + mailbox preview",             column: "side" },
  { key: "covenant",      label: "Covenant footer",     desc: "The Cirkle Covenant reminder",                        column: "side" },
] as const;

const STORAGE_KEY = "cirkle-dashboard-layout";

interface PersistedShape {
  prefs: Record<SectionKey, boolean>;
  collapsed: Record<SectionKey, boolean>;
}

function loadPersisted(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (!parsed || typeof parsed !== "object") return null;
    // Merge with defaults so new section keys added in a future release
    // get their default value rather than `undefined`.
    const prefs = { ...DEFAULT_PREFS };
    const collapsed = { ...DEFAULT_COLLAPSED };
    if (parsed.prefs) {
      for (const k of ALL_SECTION_KEYS) {
        if (typeof parsed.prefs[k] === "boolean") prefs[k] = parsed.prefs[k]!;
      }
    }
    if (parsed.collapsed) {
      for (const k of ALL_SECTION_KEYS) {
        if (typeof parsed.collapsed[k] === "boolean") collapsed[k] = parsed.collapsed[k]!;
      }
    }
    return { prefs, collapsed };
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export interface UseDashboardPrefs {
  prefs: Record<SectionKey, boolean>;
  collapsed: Record<SectionKey, boolean>;
  setPref: (key: SectionKey, visible: boolean) => void;
  toggleCollapsed: (key: SectionKey) => void;
  setCollapsed: (key: SectionKey, collapsed: boolean) => void;
  resetPrefs: () => void;
}

/**
 * React hook — load prefs lazily from localStorage so we don't need an
 * extra mount effect (avoids the setState-in-effect lint rule and the
 * flash-of-default-content that would otherwise happen on first paint).
 */
export function useDashboardPrefs(): UseDashboardPrefs {
  const [state, setState] = useState<PersistedShape>(() => {
    const persisted = loadPersisted();
    if (persisted) return persisted;
    return { prefs: { ...DEFAULT_PREFS }, collapsed: { ...DEFAULT_COLLAPSED } };
  });

  const setPref = useCallback((key: SectionKey, visible: boolean) => {
    setState((prev) => {
      const next: PersistedShape = {
        prefs: { ...prev.prefs, [key]: visible },
        collapsed: prev.collapsed,
      };
      savePersisted(next);
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback((key: SectionKey) => {
    setState((prev) => {
      const next: PersistedShape = {
        prefs: prev.prefs,
        collapsed: { ...prev.collapsed, [key]: !prev.collapsed[key] },
      };
      savePersisted(next);
      return next;
    });
  }, []);

  const setCollapsed = useCallback((key: SectionKey, collapsed: boolean) => {
    setState((prev) => {
      const next: PersistedShape = {
        prefs: prev.prefs,
        collapsed: { ...prev.collapsed, [key]: collapsed },
      };
      savePersisted(next);
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    const next: PersistedShape = {
      prefs: { ...DEFAULT_PREFS },
      collapsed: { ...DEFAULT_COLLAPSED },
    };
    savePersisted(next);
    setState(next);
  }, []);

  return {
    prefs: state.prefs,
    collapsed: state.collapsed,
    setPref,
    toggleCollapsed,
    setCollapsed,
    resetPrefs,
  };
}
