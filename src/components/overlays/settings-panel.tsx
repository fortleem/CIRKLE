"use client";

import { OverlayShell } from "@/components/ui/overlay-shell";
import { useApp } from "@/lib/app-store";
import { dict } from "@/lib/i18n";
import { COUNTRIES, getCountry, detectLocation } from "@/lib/countries";
import { Moon, Sun, Type, Contrast, Ghost, ShieldCheck, Globe, Sparkles, MapPin, Loader2, LocateFixed, FileText, Brain } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    theme, toggleTheme,
    locale, toggleLocale,
    contrast, setContrast,
    reducedMotion, setReducedMotion,
    textScale, setTextScale,
    country, setCountry, city, setCity,
    ghostMode, setGhostMode,
  } = useApp();
  const t = dict[locale];
  const c = getCountry(country);
  const [detecting, setDetecting] = useState(false);

  const detectLoc = async () => {
    setDetecting(true);
    try {
      const { country: code, city: cityName } = await detectLocation();
      setCountry(code); setCity(cityName);
      const info = getCountry(code);
      toast.success(`Location detected: ${info.flag} ${cityName}, ${info.name}`);
    } catch {
      toast.error("Couldn't detect location");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="dialog" maxWidth="sm:max-w-md" ariaLabel="Settings">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-display text-2xl">Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Everything stays on your device.</p>
        </div>

        <div className="px-4 pb-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Region & language */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Region &amp; language
            </h3>
            <button onClick={detectLoc} disabled={detecting} className="w-full mb-2 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30 p-3 flex items-center gap-3 hover:from-primary/30 transition disabled:opacity-60">
              {detecting ? <Loader2 className="w-5 h-5 text-secondary animate-spin shrink-0" /> : <LocateFixed className="w-5 h-5 text-secondary shrink-0" />}
              <div className="flex-1 text-start">
                <div className="text-sm font-medium">{detecting ? "Detecting..." : "Detect my location"}</div>
                <div className="text-[11px] text-muted-foreground">Uses GPS to set country + city</div>
              </div>
              {!detecting && <MapPin className="w-4 h-4 text-secondary shrink-0" />}
            </button>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <Globe className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Country</div>
                  <div className="text-xs text-muted-foreground">{c.flag} {c.name}</div>
                </div>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); toast.success(`Region set to ${getCountry(e.target.value).name}`); }}
                  className="text-xs bg-muted rounded-lg px-2 py-1.5 outline-none"
                >
                  {COUNTRIES.map((cc) => (
                    <option key={cc.code} value={cc.code}>{cc.flag} {cc.name}</option>
                  ))}
                </select>
              </div>
              <div className="px-4 py-3 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">City</div>
                  <div className="text-xs text-muted-foreground">{city || c.capital}</div>
                </div>
                <select
                  value={city || c.capital}
                  onChange={(e) => { setCity(e.target.value); toast.success(`City set to ${e.target.value}`); }}
                  className="text-xs bg-muted rounded-lg px-2 py-1.5 outline-none"
                >
                  {c.majorCities.map((cc) => (
                    <option key={cc} value={cc}>{cc}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => { toggleLocale(); toast.success(locale === "en" ? "العربية" : "English"); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                <Type className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Language</div>
                  <div className="text-xs text-muted-foreground">{locale === "ar" ? "العربية (RTL)" : "English"}</div>
                </div>
                <span className="text-xs text-secondary">Switch</span>
              </button>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Appearance
            </h3>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <button onClick={() => { toggleTheme(); toast.success(theme === "dark" ? "Light mode" : "Dark mode"); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                {theme === "dark" ? <Moon className="w-4 h-4 text-secondary" /> : <Sun className="w-4 h-4 text-secondary" />}
                <div className="flex-1">
                  <div className="text-sm font-medium">Theme</div>
                  <div className="text-xs text-muted-foreground">{theme === "dark" ? "Dark · Aurora" : "Light · Cream"}</div>
                </div>
                <span className="text-xs text-secondary">Toggle</span>
              </button>
              <div className="px-4 py-3 flex items-center gap-3">
                <Contrast className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">High contrast</div>
                  <div className="text-xs text-muted-foreground">Boost readability</div>
                </div>
                <Switch checked={contrast === "high"} onCheckedChange={(v) => { setContrast(v ? "high" : "standard"); toast.success(v ? "High contrast on" : "Standard contrast"); }} />
              </div>
              <div className="px-4 py-3 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Reduce motion</div>
                  <div className="text-xs text-muted-foreground">Less animation</div>
                </div>
                <Switch checked={reducedMotion} onCheckedChange={(v) => { setReducedMotion(v); toast.success(v ? "Motion reduced" : "Motion enabled"); }} />
              </div>
              <div className="px-4 py-3 flex items-center gap-3">
                <Type className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Text scale</div>
                  <div className="text-xs text-muted-foreground">{Math.round(textScale * 100)}%</div>
                </div>
                <input type="range" min={0.85} max={1.3} step={0.05} value={textScale} onChange={(e) => setTextScale(parseFloat(e.target.value))} className="w-24" />
              </div>
            </div>
          </section>

          {/* Privacy & Data */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Privacy &amp; data
            </h3>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <Ghost className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Ghost mode</div>
                  <div className="text-xs text-muted-foreground">Vanish from presence everywhere</div>
                </div>
                <Switch checked={ghostMode} onCheckedChange={(v) => { setGhostMode(v); toast.success(v ? "Ghost mode on" : "Ghost mode off"); }} />
              </div>
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:data-residency"))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Data residency</div>
                  <div className="text-xs text-muted-foreground">Your data stays in your region</div>
                </div>
                <span className="text-xs text-secondary">View</span>
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:privacy-policy"))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                <FileText className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Privacy policy</div>
                  <div className="text-xs text-muted-foreground">GDPR · PDPL · COPPA · What we collect</div>
                </div>
                <span className="text-xs text-secondary">Read</span>
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:dsr-request"))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Data subject request</div>
                  <div className="text-xs text-muted-foreground">Access, correct, delete, export</div>
                </div>
                <span className="text-xs text-secondary">Submit</span>
              </button>
            </div>
          </section>

          {/* Cirkle Brain AI */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Cirkle Brain AI
            </h3>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:personal-ai"))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                <Brain className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Personal AI OS</div>
                  <div className="text-xs text-muted-foreground">DNA · Mood · Topics · Memory</div>
                </div>
                <span className="text-xs text-secondary">Open</span>
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("circle:orchestrator"))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition text-start">
                <Sparkles className="w-4 h-4 text-secondary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Brain Orchestrator</div>
                  <div className="text-xs text-muted-foreground">Cross-feature workflows + suggestions</div>
                </div>
                <span className="text-xs text-secondary">Open</span>
              </button>
            </div>
          </section>

          <div className="text-[10px] text-muted-foreground text-center pt-2">
            Cirkle Covenant · Free, forever · {t.appName} {t.tagline}
          </div>
        </div>
    </OverlayShell>
  );
}
