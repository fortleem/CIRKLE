"use client";

import { create } from "zustand";

type Theme = "light" | "dark";
type Locale = "en" | "ar";
type Contrast = "standard" | "high";

interface AppState {
  /** Hydration-safe: false during SSR + first client paint, true after mount. */
  mounted: boolean;
  theme: Theme;
  toggleTheme: () => void;
  locale: Locale;
  toggleLocale: () => void;
  dir: "ltr" | "rtl";
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  contrast: Contrast;
  setContrast: (v: Contrast) => void;
  textScale: number;
  setTextScale: (v: number) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  country: string;
  setCountry: (v: string) => void;
  city: string | null;
  setCity: (v: string | null) => void;
  ghostMode: boolean;
  setGhostMode: (v: boolean) => void;
  /** Call once on the client to hydrate from localStorage. */
  hydrate: () => void;
}

/**
 * SSR-safe defaults. These match what the server renders.
 * The client hydrates from localStorage AFTER mount via `hydrate()`.
 * This prevents hydration mismatches (e.g., theme icon Moon vs Sun).
 */
const SSR_DEFAULTS = {
  theme: "dark" as Theme,
  locale: "en" as Locale,
  dir: "ltr" as "ltr" | "rtl",
  reducedMotion: false,
  contrast: "standard" as Contrast,
  textScale: 1,
  onboarded: false,
  country: "EG",  // Demo country: Egypt (Cairo)
  city: "Cairo" as string | null,
  ghostMode: false,
};

const ls = (k: string, fb: string) => {
  if (typeof window === "undefined") return fb;
  try { return localStorage.getItem(k) || fb; } catch { return fb; }
};

export const useApp = create<AppState>((set, get) => ({
  mounted: false,
  ...SSR_DEFAULTS,

  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().mounted) return; // already hydrated
    // Respect prefers-color-scheme for first-time visitors (no saved theme)
    let theme = (ls("circle-theme", "") as Theme);
    if (!theme) {
      theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    const locale = (ls("circle-locale", "en") as Locale);
    const country = ls("circle-country", "EG");
    const city = ls("circle-city", "Cairo") || null;
    set({
      mounted: true,
      theme,
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      reducedMotion: ls("circle-rm", "0") === "1",
      contrast: (ls("circle-contrast", "standard") as Contrast),
      textScale: parseFloat(ls("circle-text-scale", "1")),
      onboarded: localStorage.getItem("circle-onboarded") === "1",
      country,
      city,
      ghostMode: ls("circle-ghost", "0") === "1",
    });
    // Apply to <html>
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
      try { localStorage.setItem("circle-theme", next); } catch {}
    }
    set({ theme: next });
  },

  toggleLocale: () => {
    const next = get().locale === "en" ? "ar" : "en";
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      try { localStorage.setItem("circle-locale", next); } catch {}
    }
    set({ locale: next, dir: next === "ar" ? "rtl" : "ltr" });
  },

  setReducedMotion: (v) => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.reducedMotion = v ? "true" : "false";
      try { localStorage.setItem("circle-rm", v ? "1" : "0"); } catch {}
    }
    set({ reducedMotion: v });
  },

  setContrast: (v) => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.contrast = v;
      try { localStorage.setItem("circle-contrast", v); } catch {}
    }
    set({ contrast: v });
  },

  setTextScale: (v) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--text-scale", String(v));
      try { localStorage.setItem("circle-text-scale", String(v)); } catch {}
    }
    set({ textScale: v });
  },

  setOnboarded: (v) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("circle-onboarded", v ? "1" : "0"); } catch {}
    }
    set({ onboarded: v });
  },

  setCountry: (v) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("circle-country", v); } catch {}
    }
    set({ country: v, city: null });
  },

  setCity: (v) => {
    if (typeof window !== "undefined") {
      try {
        if (v) localStorage.setItem("circle-city", v);
        else localStorage.removeItem("circle-city");
      } catch {}
    }
    set({ city: v });
  },

  setGhostMode: (v) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("circle-ghost", v ? "1" : "0"); } catch {}
    }
    set({ ghostMode: v });
  },
}));
