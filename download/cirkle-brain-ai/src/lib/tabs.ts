import { Home, MessageCircle, Play, Image as ImageIcon, Hash, Plane, Wallet, User } from "lucide-react";

export const TABS = [
  { id: "home", labelKey: "home", icon: Home },
  { id: "wasl", labelKey: "wasl", icon: MessageCircle },
  { id: "mashahd", labelKey: "mashahd", icon: Play },
  { id: "lamahat", labelKey: "lamahat", icon: ImageIcon },
  { id: "midan", labelKey: "midan", icon: Hash },
  { id: "rihla", labelKey: "rihla", icon: Plane },
  { id: "pay", labelKey: "pay", icon: Wallet },
  { id: "profile", labelKey: "profile", icon: User },
] as const;

export type TabId = typeof TABS[number]["id"];
