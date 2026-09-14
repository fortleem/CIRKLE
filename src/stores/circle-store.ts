"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ModuleId } from "@/lib/circle/modules";

interface CircleState {
  // Navigation
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;

  // Sub-tab (used inside modules like Lamahat → for-you/nearby/etc.)
  activeSubtab: Record<string, string>;
  setActiveSubtab: (module: string, tab: string) => void;

  // Region / DRE
  regionCode: string;
  setRegionCode: (code: string) => void;

  // Language preference: brand | us | arabic
  nameStyle: "brand" | "us" | "arabic";
  setNameStyle: (style: "brand" | "us" | "arabic") => void;

  // Theme
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;

  // Privacy — Ghost Mode
  ghostMode: boolean;
  setGhostMode: (v: boolean) => void;

  // Screenshot consent
  screenshotConsentRequired: boolean;
  setScreenshotConsentRequired: (v: boolean) => void;

  // Reduced motion
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  // High contrast
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;

  // Active conversation (Wasl)
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Sidebar collapsed (desktop)
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Mobile sidebar open
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;

  // Command palette open
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

export const useCircleStore = create<CircleState>()(
  persist(
    (set) => ({
      activeModule: "home",
      setActiveModule: (id) => set({ activeModule: id, mobileNavOpen: false }),

      activeSubtab: {},
      setActiveSubtab: (module, tab) =>
        set((s) => ({ activeSubtab: { ...s.activeSubtab, [module]: tab } })),

      regionCode: "EG",
      setRegionCode: (code) => set({ regionCode: code }),

      nameStyle: "brand",
      setNameStyle: (style) => set({ nameStyle: style }),

      theme: "dark",
      setTheme: (t) => set({ theme: t }),

      ghostMode: false,
      setGhostMode: (v) => set({ ghostMode: v }),

      screenshotConsentRequired: true,
      setScreenshotConsentRequired: (v) => set({ screenshotConsentRequired: v }),

      reducedMotion: false,
      setReducedMotion: (v) => set({ reducedMotion: v }),

      highContrast: false,
      setHighContrast: (v) => set({ highContrast: v }),

      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      mobileNavOpen: false,
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),
    }),
    {
      name: "circle-prefs",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeModule: s.activeModule,
        activeSubtab: s.activeSubtab,
        regionCode: s.regionCode,
        nameStyle: s.nameStyle,
        theme: s.theme,
        ghostMode: s.ghostMode,
        screenshotConsentRequired: s.screenshotConsentRequired,
        reducedMotion: s.reducedMotion,
        highContrast: s.highContrast,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
