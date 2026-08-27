"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  SECTION_META,
  DEFAULT_PREFS,
  type SectionKey,
  type UseDashboardPrefs,
} from "@/lib/dashboard-prefs";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

/**
 * "Customize Dashboard" sheet — lets the user toggle which Home-screen
 * sections are visible. Backed by `useDashboardPrefs` (localStorage).
 *
 * Sections are grouped by column (main feed / sidebar) and rendered as
 * toggle rows. A "Reset to defaults" button restores the 5-section default.
 */
export function CustomizeDashboardSheet({
  open,
  onOpenChange,
  prefs,
  setPref,
  resetPrefs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: Record<SectionKey, boolean>;
  setPref: (key: SectionKey, visible: boolean) => void;
  resetPrefs: () => void;
}) {
  const mainSections = SECTION_META.filter((s) => s.column === "main");
  const sideSections = SECTION_META.filter((s) => s.column === "side");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),1.5rem)] max-h-[85vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <SheetHeader className="text-center pb-2">
          <SheetTitle className="font-display text-xl">Customize dashboard</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Pick what shows on your Home screen. Changes save automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          <SectionGroup
            title="Main feed"
            sections={mainSections}
            prefs={prefs}
            setPref={setPref}
          />
          <SectionGroup
            title="Sidebar"
            sections={sideSections}
            prefs={prefs}
            setPref={setPref}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">
            Defaults show {Object.values(DEFAULT_PREFS).filter(Boolean).length} sections.
            Your choices persist on this device.
          </div>
          <button
            onClick={() => {
              resetPrefs();
              toast.success("Reset to defaults", {
                description: "5 sections visible · others can be toggled on here.",
              });
            }}
            className="text-xs px-3 py-1.5 rounded-full glass border border-border/60 hover:bg-muted/60 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionGroup({
  title,
  sections,
  prefs,
  setPref,
}: {
  title: string;
  sections: readonly { key: SectionKey; label: string; desc: string }[];
  prefs: Record<SectionKey, boolean>;
  setPref: (key: SectionKey, visible: boolean) => void;
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
        {title}
      </h3>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        {sections.map((s) => (
          <label
            key={s.key}
            htmlFor={`pref-${s.key}`}
            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">{s.desc}</div>
            </div>
            <Switch
              id={`pref-${s.key}`}
              checked={!!prefs[s.key]}
              onCheckedChange={(v) => setPref(s.key, v)}
              aria-label={`Show ${s.label}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** Tiny chevron button used inline next to a section's SectionHeader. */
export function CollapseChevron({
  collapsed,
  onToggle,
  label,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="ml-auto shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-full hover:bg-muted/40"
      aria-label={collapsed ? "Expand section" : "Collapse section"}
      aria-expanded={!collapsed}
    >
      {label && <span className="hidden sm:inline">{label}</span>}
      <svg
        className={`w-3.5 h-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

/** Re-export so consumers can grab the hook + components together. */
export type { UseDashboardPrefs };
