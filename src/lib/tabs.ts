import { Home, MessageCircle, Play, Image as ImageIcon, Hash, Plane, Wallet, User, LayoutGrid, type LucideIcon } from "lucide-react";

export type TabId = "home" | "wasl" | "mashahd" | "lamahat" | "midan" | "rihla" | "pay" | "profile";

export interface TabDef {
  id: TabId;
  labelKey: string;
  icon: LucideIcon;
  tier: "primary" | "secondary";
  subtitle?: string;
}

// Primary tabs (5) — always visible in dock
export const PRIMARY_TABS: TabDef[] = [
  { id: "home", labelKey: "home", icon: Home, tier: "primary" },
  { id: "wasl", labelKey: "wasl", icon: MessageCircle, tier: "primary" },
  { id: "midan", labelKey: "midan", icon: Hash, tier: "primary" },
  { id: "pay", labelKey: "pay", icon: Wallet, tier: "primary" },
  { id: "profile", labelKey: "profile", icon: User, tier: "primary" },
];

// Secondary tabs (3) — accessible via "More" sheet
export const SECONDARY_TABS: TabDef[] = [
  { id: "mashahd", labelKey: "mashahd", icon: Play, tier: "secondary", subtitle: "Video" },
  { id: "lamahat", labelKey: "lamahat", icon: ImageIcon, tier: "secondary", subtitle: "Photos" },
  { id: "rihla", labelKey: "rihla", icon: Plane, tier: "secondary", subtitle: "Travel" },
];

// More button icon
export const MORE_TAB_ICON = LayoutGrid;

// All tabs combined (for backward compatibility)
export const TABS: readonly TabDef[] = [...PRIMARY_TABS, ...SECONDARY_TABS] as const;

// Helper: is this tab primary?
export function isPrimaryTab(id: TabId): boolean {
  return PRIMARY_TABS.some(t => t.id === id);
}

// Helper: is this tab secondary?
export function isSecondaryTab(id: TabId): boolean {
  return SECONDARY_TABS.some(t => t.id === id);
}

// Helper: get tab by id
export function getTab(id: TabId): TabDef | undefined {
  return TABS.find(t => t.id === id);
}
