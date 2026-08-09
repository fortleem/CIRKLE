"use client";
import { useApp } from "@/lib/app-store";
import { dict } from "@/lib/i18n";
import { Sun, Moon, Languages, Bell, Search, Settings as SettingsIcon, Mail, MapPin, Sparkles } from "lucide-react";
import { getCountry } from "@/lib/countries";
import { CircleMark } from "@/components/brand/circle-mark";

export function TopBar({ title, onSearch, onSettings }: { title?: string; onSearch?: () => void; onSettings?: () => void }) {
  const { theme, toggleTheme, locale, toggleLocale, mounted, country, city } = useApp();
  const cInfo = getCountry(country);
  const effectiveCity = city || cInfo.capital;
  // Use SSR-safe defaults until mounted to avoid hydration mismatch
  const t = dict[locale];
  const effectiveTheme = mounted ? theme : "dark";
  return (
    <header className="sticky top-0 z-40 px-5 pt-[env(safe-area-inset-top)]">
      <div className="glass rounded-full mt-3 px-3 py-2 flex items-center gap-2 shadow-glass">
        <div className="flex items-center gap-2 min-w-0">
          <CircleMark size={32} />
          <div className="leading-none min-w-0">
            <div className="font-display text-lg truncate">{title || t.appName}</div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase truncate">{t.tagline}</div>
          </div>
        </div>
        <button onClick={onSettings} className="flex items-center gap-1.5 glass rounded-full px-2.5 py-1.5 text-xs hover:bg-muted/60 transition min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label={`Location: ${effectiveCity}, ${cInfo.name}`}>
          <MapPin className="w-3 h-3 text-secondary shrink-0" />
          <span className="truncate max-w-[120px]">{cInfo.flag} {effectiveCity}</span>
        </button>
        <div className="flex-1" />
        <button onClick={onSearch} className="hidden sm:flex items-center gap-2 text-xs glass rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label="Search">
          <Search className="w-3.5 h-3.5" /> <span>Search</span> <kbd className="ms-1 text-[9px] px-1 py-0.5 rounded bg-muted">⌘K</kbd>
        </button>
        <button onClick={onSearch} className="sm:hidden min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Search"><Search className="w-4 h-4" /></button>
        <button onClick={() => window.dispatchEvent(new CustomEvent("circle:whats-new"))} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="What's new — discover features" title="What's New">
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
        </button>
        <button onClick={toggleLocale} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Switch language"><Languages className="w-4 h-4" /></button>
        <button onClick={() => window.dispatchEvent(new CustomEvent("circle:hub"))} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Cirkle Mail"><Mail className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden /></button>
        <button onClick={onSettings} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Settings"><SettingsIcon className="w-4 h-4" /></button>
        <button onClick={toggleTheme} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Toggle theme">{effectiveTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent("circle:whats-new"))} className="min-w-[44px] min-h-[44px] rounded-full bg-gradient-gold flex items-center justify-center text-charcoal relative transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label="Notifications and what's new"><Bell className="w-4 h-4" /><span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" aria-hidden /></button>
      </div>
    </header>
  );
}
