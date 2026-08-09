"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  X, Users, Globe, Lock, EyeOff, Crown, Shield, UserCog, UserCheck,
  MessageCircle, Heart, Repeat2, Calendar, Settings2, Loader2,
  Hash, Building2, Briefcase, Heart as HobbyIcon, GraduationCap, Trophy,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "private" | "public" | "anonymous";
type Category = "Social" | "Professional" | "Hobby" | "Community" | "Study" | "Sports";
type Role = "owner" | "admin" | "moderator" | "member";
type Tab = "feed" | "members" | "events" | "settings";

interface Member {
  userLabel: string;
  role: Role;
  joinedAt: string;
}

interface Post {
  id: string;
  authorHandle: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  body: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  visibility: string;
}

interface CircleDetail {
  id: string;
  name: string;
  description: string;
  mode: Mode;
  category: Category;
  avatarColor: string;
  avatarInitials: string;
  encrypted: boolean;
  ownerLabel: string;
  settings: {
    joinApprovalRequired: boolean;
    membersCanPost: boolean;
    membersCanShareMedia: boolean;
    membersCanInvite: boolean;
    membersCanCreateEvents: boolean;
  };
  members: Member[];
  memberCount: number;
  online: number;
  recentPosts: Post[];
  events: { title: string; date: string; attendees: number }[];
  createdAt: string;
}

const MODE_ICON: Record<Mode, LucideIcon> = {
  private: Lock,
  public: Globe,
  anonymous: EyeOff,
};

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Social: Users,
  Professional: Briefcase,
  Hobby: HobbyIcon,
  Community: Building2,
  Study: GraduationCap,
  Sports: Trophy,
};

const ROLE_ICON: Record<Role, LucideIcon> = {
  owner: Crown,
  admin: Shield,
  moderator: UserCog,
  member: UserCheck,
};

const TABS: { k: Tab; label: string; icon: LucideIcon }[] = [
  { k: "feed", label: "Feed", icon: MessageCircle },
  { k: "members", label: "Members", icon: Users },
  { k: "events", label: "Events", icon: Calendar },
  { k: "settings", label: "Settings", icon: Settings2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// CircleDetail — overlay showing a Circle's info, members, posts, and settings.
// ─────────────────────────────────────────────────────────────────────────────

export function CircleDetail({
  open, circleId, onClose,
}: {
  open: boolean;
  circleId: string | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("feed");

  // Reset to the feed tab whenever a new circle is opened.
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevId, setPrevId] = useState(circleId);
  if (open && (!prevOpen || prevId !== circleId)) {
    setPrevOpen(true);
    setPrevId(circleId);
    setTab("feed");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const { data: circle, isLoading } = useQuery<CircleDetail | null>({
    queryKey: ["circle", circleId],
    queryFn: async () => {
      if (!circleId) return null;
      const res = await fetch(`/api/circles/${encodeURIComponent(circleId)}`, { cache: "no-store" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e?.error || `Failed to load circle (${res.status})`);
      }
      return (await res.json()) as CircleDetail;
    },
    enabled: open && !!circleId,
    staleTime: 30_000,
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog" aria-label={circle?.name || "Circle detail"}
            className="fixed inset-x-0 bottom-0 top-[5vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            {/* Header */}
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              {circle ? (
                <>
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-${circle.avatarColor} to-${circle.avatarColor}/70 flex items-center justify-center text-cream font-display text-sm shrink-0`}
                  >
                    {circle.avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg leading-tight truncate">{circle.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        {(() => {
                          const Ic = MODE_ICON[circle.mode];
                          return <Ic className="w-3 h-3" />;
                        })()}
                        <span className="capitalize">{circle.mode}</span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {(() => {
                          const Ic = CATEGORY_ICON[circle.category];
                          return <Ic className="w-3 h-3" />;
                        })()}
                        {circle.category}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {circle.memberCount}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <div className="h-5 w-40 rounded bg-muted/40 animate-pulse" />
                  <div className="h-3 w-56 rounded bg-muted/30 animate-pulse mt-2" />
                </div>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Description banner */}
            {circle?.description && (
              <div className="px-5 py-2.5 border-b border-border/40">
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {circle.description}
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="px-3 py-2 border-b border-border/40 flex gap-1 overflow-x-auto scrollbar-hide">
              {TABS.map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`px-3 py-1.5 rounded-full text-[12px] flex items-center gap-1.5 transition shrink-0 ${
                    tab === t.k
                      ? "bg-primary text-primary-foreground"
                      : "glass hover:bg-muted/60"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading Circle…</span>
                </div>
              ) : !circle ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Circle not found.
                </div>
              ) : tab === "feed" ? (
                <FeedTab posts={circle.recentPosts} canPost={circle.settings.membersCanPost} />
              ) : tab === "members" ? (
                <MembersTab members={circle.members} ownerLabel={circle.ownerLabel} />
              ) : tab === "events" ? (
                <EventsTab events={circle.events} canCreate={circle.settings.membersCanCreateEvents} />
              ) : (
                <SettingsTab circle={circle} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

function FeedTab({ posts, canPost }: { posts: Post[]; canPost: boolean }) {
  if (!canPost) {
    return (
      <div className="rounded-2xl bg-secondary/5 border border-secondary/20 p-3 text-[11px] text-muted-foreground mb-3">
        Posting is restricted to admins and moderators.
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageCircle className="w-8 h-8 mx-auto opacity-50 mb-2" />
        <div className="text-sm">No posts yet</div>
        <div className="text-[11px] mt-1">Be the first to share in this Circle.</div>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.id} className="rounded-2xl glass p-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-cream font-display text-xs shrink-0 uppercase`}>
              {p.authorInitials || p.authorHandle.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.authorName}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                @{p.authorHandle} · {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
            {p.visibility === "anonymous" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-secondary">
                <EyeOff className="w-3 h-3" /> anon
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {p.body}
          </p>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3 h-3" /> {p.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> {p.comments}
            </span>
            <span className="inline-flex items-center gap-1">
              <Repeat2 className="w-3 h-3" /> {p.shares}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MembersTab({ members, ownerLabel }: { members: Member[]; ownerLabel: string }) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-8 h-8 mx-auto opacity-50 mb-2" />
        <div className="text-sm">No members yet</div>
      </div>
    );
  }
  // Sort: owner first, then admin, then moderator, then member.
  const order: Record<Role, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };
  const sorted = [...members].sort((a, b) => order[a.role] - order[b.role]);
  return (
    <ul className="space-y-2">
      {sorted.map((m) => {
        const Ic = ROLE_ICON[m.role];
        const isOwner = m.userLabel === ownerLabel;
        return (
          <li key={m.userLabel} className="rounded-2xl glass p-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-cream font-display text-xs shrink-0 uppercase">
              {m.userLabel.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                @{m.userLabel}
                {isOwner && <span className="text-[10px] text-secondary ml-1.5">· you</span>}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Joined {new Date(m.joinedAt).toLocaleDateString()}
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full capitalize ${
              m.role === "owner" ? "bg-gold/20 text-gold" :
              m.role === "admin" ? "bg-secondary/15 text-secondary" :
              m.role === "moderator" ? "bg-primary/15 text-primary" :
              "glass text-muted-foreground"
            }`}>
              <Ic className="w-3 h-3" />
              {m.role}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function EventsTab({
  events, canCreate,
}: { events: { title: string; date: string; attendees: number }[]; canCreate: boolean }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto opacity-50 mb-2" />
        <div className="text-sm">No upcoming events</div>
        {canCreate ? (
          <button
            onClick={() => toast("Event creation — coming soon")}
            className="mt-3 text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
          >
            Schedule an event
          </button>
        ) : (
          <div className="text-[11px] mt-1">Only admins/moderators can create events.</div>
        )}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((e, i) => (
        <li key={i} className="rounded-2xl glass p-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center text-cream shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{e.title}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(e.date).toLocaleString()} · {e.attendees} attending
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SettingsTab({ circle }: { circle: CircleDetail }) {
  const s = circle.settings;
  const rows: { label: string; value: boolean }[] = [
    { label: "Require approval to join", value: s.joinApprovalRequired },
    { label: "Members can post", value: s.membersCanPost },
    { label: "Members can share media", value: s.membersCanShareMedia },
    { label: "Members can invite", value: s.membersCanInvite },
    { label: "Members can create events", value: s.membersCanCreateEvents },
  ];
  return (
    <div className="space-y-3">
      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
          About
        </div>
        <div className="rounded-2xl glass p-3 space-y-1.5 text-[12px]">
          <Row label="Created" value={new Date(circle.createdAt).toLocaleDateString()} />
          <Row label="Owner" value={`@${circle.ownerLabel}`} />
          <Row label="Mode" value={circle.mode} />
          <Row label="Category" value={circle.category} />
          <Row label="Encrypted" value={circle.encrypted ? "Yes" : "No"} />
        </div>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
          Permissions
        </div>
        <div className="rounded-2xl glass p-3 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[12px]">
              <span>{r.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                r.value ? "bg-secondary/15 text-secondary" : "bg-muted/40 text-muted-foreground"
              }`}>
                {r.value ? "On" : "Off"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => toast("Edit settings — coming soon")}
        className="w-full py-2.5 rounded-full glass text-sm flex items-center justify-center gap-2 hover:bg-muted/60 transition"
      >
        <Settings2 className="w-4 h-4" />
        Edit settings
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
