"use client";
import { TABS, type TabId } from "@/lib/tabs";
import { useApp } from "@/lib/app-store";
import { dict } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Sparkles,
  ScanLine,
  Plus,
  QrCode,
  Radio,
  Upload,
  ListVideo,
  Video,
  Camera,
  Images,
  PenLine,
  Flame,
  UserSquare,
  Plane,
  Hotel,
  FileText,
  Send,
  ReceiptText,
  Settings,
  Palette,
  LogOut,
  type LucideIcon,
} from "lucide-react";

// ── Radial menu action model ─────────────────────────────────
type RadialAction = {
  icon: LucideIcon;
  label: string;
  evt?: string;
  evtDetail?: unknown;
  tab?: TabId;
};

const RADIAL_ACTIONS: Record<TabId, RadialAction[]> = {
  home: [
    { icon: RefreshCw, label: "Refresh", evt: "circle:refresh" },
    { icon: Sparkles, label: "Open AI", evt: "circle:ai" },
    { icon: ScanLine, label: "Scan & Pay", tab: "pay" },
  ],
  wasl: [
    { icon: Plus, label: "New chat", evt: "circle:add-contact" },
    { icon: QrCode, label: "Scan QR", evt: "circle:contact-qr" },
    { icon: Radio, label: "Broadcast", evt: "circle:broadcast-channel" },
  ],
  mashahd: [
    { icon: Upload, label: "Upload", evt: "circle:composer", evtDetail: { kind: "media" } },
    { icon: Video, label: "Go Live", evt: "circle:go-live" },
    { icon: ListVideo, label: "Playlists", evt: "circle:playlists" },
  ],
  lamahat: [
    { icon: Camera, label: "Camera", evt: "circle:lamahat-camera" },
    { icon: Upload, label: "Upload photo", evt: "circle:composer", evtDetail: { kind: "media" } },
    { icon: Images, label: "Albums", evt: "circle:lamahat-albums" },
  ],
  midan: [
    { icon: PenLine, label: "Compose", evt: "circle:composer", evtDetail: { kind: "post" } },
    { icon: Flame, label: "Trending", evt: "circle:midan-trending" },
    { icon: UserSquare, label: "My posts", evt: "circle:midan-my-posts" },
  ],
  rihla: [
    { icon: Plane, label: "Flights", evt: "circle:rihla-flights" },
    { icon: Hotel, label: "Hotels", evt: "circle:rihla-hotels" },
    { icon: FileText, label: "Visa", evt: "circle:rihla-visa" },
  ],
  pay: [
    { icon: Send, label: "Send", evt: "circle:pay-send" },
    { icon: ScanLine, label: "Scan & Pay", evt: "circle:pay-scan" },
    { icon: ReceiptText, label: "Split receipt", evt: "circle:receipt-split" },
  ],
  profile: [
    { icon: Settings, label: "Settings", evt: "circle:settings" },
    { icon: Palette, label: "Theme", evt: "circle:theme-toggle" },
    { icon: LogOut, label: "Logout", evt: "circle:logout" },
  ],
};

const RADIAL_RADIUS = 82;
const RADIAL_BUTTON_SIZE = 56;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;

export function Dock({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const { locale } = useApp();
  const t = dict[locale].nav;
  const [unread, setUnread] = useState(0);
  const [radialMenu, setRadialMenu] = useState<{ tab: TabId; x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Prevents the synthetic click that follows a long-press / right-click from
  // also switching the active tab.
  const suppressClick = useRef(false);

  // Footer opacity: very opaque when idle, normal glass when scrolling
  useEffect(() => {
    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => setIsScrolling(false), 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimeout.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const total = (data as Array<{ unread?: number }>).reduce((sum, c) => sum + (c.unread ?? 0), 0);
        setUnread(total);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Clear any pending long-press timer on unmount
  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Close the radial menu on Escape / scroll / viewport resize
  useEffect(() => {
    if (!radialMenu) return;
    const close = () => setRadialMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [radialMenu]);

  const clampAnchor = (clientX: number, clientY: number) => {
    const margin = RADIAL_RADIUS + RADIAL_BUTTON_SIZE / 2 + 8;
    const x = Math.min(Math.max(clientX, margin), window.innerWidth - margin);
    // Keep the whole semicircle (radius + button) above the anchor visible
    const y = Math.max(clientY, RADIAL_RADIUS + RADIAL_BUTTON_SIZE / 2 + 16);
    return { x, y };
  };

  const startLongPress = (tab: TabId, e: React.PointerEvent) => {
    // Each new pointer interaction resets the suppress flag so a subsequent
    // quick tap still switches tabs after a previous long-press menu closed.
    suppressClick.current = false;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = undefined;
      suppressClick.current = true;
      const { x, y } = clampAnchor(e.clientX, e.clientY);
      setRadialMenu({ tab, x, y });
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    longPressStart.current = null;
  };

  // Cancel long-press if the pointer moves beyond a small threshold — this
  // allows the user to still scroll the dock horizontally without triggering
  // the radial menu.
  const onPointerMove = (e: React.PointerEvent) => {
    if (!longPressStart.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD) cancelLongPress();
  };

  const handleContextMenu = (tab: TabId, e: React.MouseEvent) => {
    e.preventDefault();
    cancelLongPress();
    suppressClick.current = true;
    const { x, y } = clampAnchor(e.clientX, e.clientY);
    setRadialMenu({ tab, x, y });
  };

  const handleButtonClick = (tab: TabId) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onChange(tab);
  };

  const dispatchAction = (action: RadialAction) => {
    if (action.tab) {
      onChange(action.tab);
      window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: action.tab } }));
    }
    if (action.evt) {
      window.dispatchEvent(
        new CustomEvent(action.evt, action.evtDetail ? { detail: action.evtDetail } : undefined),
      );
    }
    setRadialMenu(null);
  };

  // Precompute semicircle positions: angles 180° → 360° (passing through 270°
  // = straight up), so the menu fans out above the dock.
  const actions = radialMenu ? RADIAL_ACTIONS[radialMenu.tab] ?? [] : [];
  const count = actions.length;
  const positions = actions.map((_, i) => {
    const angleDeg = count <= 1 ? 270 : 180 + (i / (count - 1)) * 180;
    const rad = (angleDeg * Math.PI) / 180;
    return { x: RADIAL_RADIUS * Math.cos(rad), y: RADIAL_RADIUS * Math.sin(rad) };
  });

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <div className="px-3 pb-3 flex justify-center pointer-events-auto">
        <nav className={`shadow-float rounded-full px-2 py-2 flex items-center gap-0.5 max-w-full overflow-x-auto scrollbar-hide transition-all duration-300 ${isScrolling ? "glass-strong" : "bg-background/95 backdrop-blur-md border border-border/40"}`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            const badge = tab.id === "wasl" ? unread : 0;
            return (
              <button
                key={tab.id}
                onClick={() => handleButtonClick(tab.id)}
                onContextMenu={(e) => handleContextMenu(tab.id, e)}
                onPointerDown={(e) => startLongPress(tab.id, e)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerMove={onPointerMove}
                onPointerCancel={cancelLongPress}
                className="relative flex items-center justify-center min-w-11 h-11 px-3 rounded-full transition-colors select-none"
                aria-label={t[tab.labelKey as keyof typeof t]}
              >
                {isActive && <motion.span layoutId="dock-pill" className="absolute inset-0 rounded-full bg-gradient-hero" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className={`relative flex items-center gap-2 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  {isActive && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="text-xs font-medium whitespace-nowrap pr-1">{t[tab.labelKey as keyof typeof t]}</motion.span>}
                </span>
                {badge > 0 && !isActive && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence>
        {radialMenu && (
          <>
            {/* Outside-tap catcher — closes the menu when tapping anywhere else */}
            <div
              onClick={() => setRadialMenu(null)}
              className="fixed inset-0 z-[60] bg-transparent cursor-default"
              aria-hidden="true"
            />

            {/* Radial menu anchored at the long-press / right-click point */}
            <div
              className="fixed z-[61] pointer-events-none"
              style={{
                left: radialMenu.x,
                top: radialMenu.y,
                transform: "translate(-50%, -50%)",
              }}
              role="menu"
              aria-label="Quick actions"
            >
              {/* Center anchor dot */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.7 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent"
              />

              {actions.map((action, i) => {
                const pos = positions[i];
                const ActionIcon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    type="button"
                    role="menuitem"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                    animate={{ x: pos.x, y: pos.y, opacity: 1, scale: 1 }}
                    exit={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28, delay: i * 0.035 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchAction(action);
                    }}
                    className="absolute top-1/2 left-1/2 pointer-events-auto flex flex-col items-center justify-center gap-0.5 rounded-full glass-strong shadow-float"
                    style={{
                      width: RADIAL_BUTTON_SIZE,
                      height: RADIAL_BUTTON_SIZE,
                      marginLeft: -RADIAL_BUTTON_SIZE / 2,
                      marginTop: -RADIAL_BUTTON_SIZE / 2,
                    }}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <ActionIcon className="w-5 h-5 text-foreground" strokeWidth={2.1} />
                    <span className="text-[8px] leading-none font-medium text-muted-foreground truncate max-w-[44px]">
                      {action.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
