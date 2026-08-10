"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  X, ChevronRight, ChevronLeft, Check, Users, Globe, Lock, EyeOff,
  Briefcase, Heart, Gamepad2, Building2, GraduationCap, Trophy,
  Search, Plus, Trash2, Shield, Crown, UserCog, UserCheck, User as UserIcon,
  Settings2, Loader2, Sparkles, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, cirkleInitials } from "@/lib/auth-store";
import { ANONYMOUS_PRIVACY_NOTICE } from "@/lib/anonymous-identity";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "private" | "public" | "anonymous";
type Category = "Social" | "Professional" | "Hobby" | "Community" | "Study" | "Sports";
type Role = "owner" | "admin" | "moderator" | "member";

interface Invitee {
  handle: string;
  role: Role;
}

const MODES: { k: Mode; i: LucideIcon; title: string; desc: string }[] = [
  { k: "private", i: Lock, title: "Private", desc: "Invite-only. Not listed in discovery." },
  { k: "public", i: Globe, title: "Public", desc: "Anyone can find and join this Circle." },
  { k: "anonymous", i: EyeOff, title: "Anonymous", desc: "Members post under per-Circle pseudonyms. Real identities are never linked." },
];

const CATEGORIES: { k: Category; i: LucideIcon }[] = [
  { k: "Social", i: Users },
  { k: "Professional", i: Briefcase },
  { k: "Hobby", i: Heart },
  { k: "Community", i: Building2 },
  { k: "Study", i: GraduationCap },
  { k: "Sports", i: Trophy },
];

const ROLES: { k: Role; i: LucideIcon; desc: string }[] = [
  { k: "owner", i: Crown, desc: "Full control — delete, transfer, all settings." },
  { k: "admin", i: Shield, desc: "Manage members, posts, and settings." },
  { k: "moderator", i: UserCog, desc: "Remove posts, mute members." },
  { k: "member", i: UserCheck, desc: "Post, comment, and react." },
];

const TOTAL_STEPS = 5;

// ─────────────────────────────────────────────────────────────────────────────
// CircleCreate — multi-step creation flow for new Circle groups.
// ─────────────────────────────────────────────────────────────────────────────

export function CircleCreate({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated?: (circleId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Wizard state.
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<Mode>("private");
  const [category, setCategory] = useState<Category>("Social");
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [search, setSearch] = useState("");
  const [joinApproval, setJoinApproval] = useState(true);
  const [membersCanPost, setMembersCanPost] = useState(true);
  const [membersCanShareMedia, setMembersCanShareMedia] = useState(true);
  const [membersCanInvite, setMembersCanInvite] = useState(false);
  const [membersCanCreateEvents, setMembersCanCreateEvents] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset on open (derived-state pattern — avoids setState-in-effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setStep(0);
    setName("");
    setDescription("");
    setMode("private");
    setCategory("Social");
    setInvitees([]);
    setSearch("");
    setJoinApproval(true);
    setMembersCanPost(true);
    setMembersCanShareMedia(true);
    setMembersCanInvite(false);
    setMembersCanCreateEvents(false);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Suggested invitees — pulled from the user's follow graph so the
  // picker has something to surface beyond free-text entry.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !user?.username) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/follow?username=${encodeURIComponent(user.username!)}&direction=following`,
          { cache: "no-store" },
        );
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        const handles: string[] = (data.edges || []).map((e: { other: string }) =>
          e.other.replace(/^@/, ""),
        );
        setSuggestions(handles);
      } catch {
        /* no-op */
      }
    })();
    return () => { cancelled = true; };
  }, [open, user?.username]);

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, "");
    const invited = new Set(invitees.map((i) => i.handle));
    return suggestions
      .filter((h) => !invited.has(h))
      .filter((h) => (q ? h.includes(q) : true))
      .slice(0, 6);
  }, [suggestions, search, invitees]);

  const canAdvance = useMemo(() => {
    if (step === 0) return name.trim().length >= 2 && name.trim().length <= 60;
    if (step === 1) return !!mode;
    if (step === 2) return !!category;
    if (step === 3) return true; // Invitations are optional.
    if (step === 4) return true; // Settings all have safe defaults.
    return false;
  }, [step, name, mode, category]);

  const addInvitee = (handle: string, role: Role = "member") => {
    const h = handle.trim().toLowerCase().replace(/^@/, "");
    if (!h) return;
    if (invitees.some((i) => i.handle === h)) {
      toast.error(`@${h} is already invited`);
      return;
    }
    setInvitees((arr) => [...arr, { handle: h, role }]);
    setSearch("");
  };

  const removeInvitee = (handle: string) => {
    setInvitees((arr) => arr.filter((i) => i.handle !== handle));
  };

  const setInviteeRole = (handle: string, role: Role) => {
    setInvitees((arr) => arr.map((i) => (i.handle === handle ? { ...i, role } : i)));
  };

  const create = async () => {
    if (creating) return;
    if (!name.trim()) {
      toast.error("Circle name is required");
      setStep(0);
      return;
    }
    const ownerLabel = user?.username ?? "u_current";
    setCreating(true);

    const settings: string[] = [];
    if (joinApproval) settings.push("joinApprovalRequired");
    if (membersCanPost) settings.push("membersCanPost");
    if (membersCanShareMedia) settings.push("membersCanShareMedia");
    if (membersCanInvite) settings.push("membersCanInvite");
    if (membersCanCreateEvents) settings.push("membersCanCreateEvents");

    const body = {
      name: name.trim(),
      description: description.trim(),
      mode,
      category,
      avatarColor: user?.avatarColor ?? "teal",
      avatarInitials: cirkleInitials(user ?? { displayName: name }),
      ownerLabel,
      settings: settings.join(" "),
      invitees: invitees.map((i) => ({ handle: i.handle, role: i.role })),
    };

    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      toast.success("Circle created!", {
        description: `${name.trim()} is ready · ${invitees.length} invitation${invitees.length === 1 ? "" : "s"} sent`,
      });
      onCreated?.(data.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create Circle");
    } finally {
      setCreating(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
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
            role="dialog" aria-label="Create a Circle"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            {/* Header — step indicator + close */}
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl leading-tight">Create a Circle</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Step {step + 1} of {TOTAL_STEPS} · {stepTitle(step)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Progress bar */}
            <div className="h-1 bg-border/30">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary to-primary"
                initial={false}
                animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {step === 0 && (
                <section className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Circle name <span className="text-accent">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 60))}
                      placeholder="e.g. Riyadh Designers"
                      className="mt-1.5 w-full glass rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/40"
                      autoFocus
                    />
                    <div className="text-[10px] text-muted-foreground mt-1 text-end">
                      {name.length}/60
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 280))}
                      placeholder="What is this Circle about?"
                      className="mt-1.5 w-full glass rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/40 min-h-[80px] resize-none"
                    />
                    <div className="text-[10px] text-muted-foreground mt-1 text-end">
                      {description.length}/280
                    </div>
                  </div>
                  <div className="rounded-2xl bg-secondary/5 border border-secondary/20 p-3 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Circles are community spaces. You can change the name and description
                      later, but the mode (private/public/anonymous) is harder to reverse
                      once members join.
                    </p>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-medium mb-1">Who can find this Circle?</h3>
                  {MODES.map((m) => (
                    <button
                      key={m.k}
                      onClick={() => setMode(m.k)}
                      className={`w-full text-left rounded-2xl p-3 flex items-start gap-3 transition border ${
                        mode === m.k
                          ? "bg-secondary/15 border-secondary/50"
                          : "glass border-border/50 hover:bg-muted/40"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        mode === m.k ? "bg-secondary text-cream" : "bg-muted/40 text-foreground"
                      }`}>
                        <m.i className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {m.title}
                          {mode === m.k && <Check className="w-3.5 h-3.5 text-secondary" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  ))}
                  {mode === "anonymous" && (
                    <div className="rounded-2xl bg-secondary/5 border border-secondary/30 p-3 flex items-start gap-2.5">
                      <EyeOff className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {ANONYMOUS_PRIVACY_NOTICE}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {step === 2 && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-medium mb-1">Pick a category</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.k}
                        onClick={() => setCategory(c.k)}
                        className={`rounded-2xl p-3 flex flex-col items-center gap-2 transition border ${
                          category === c.k
                            ? "bg-secondary/15 border-secondary/50"
                            : "glass border-border/50 hover:bg-muted/40"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          category === c.k ? "bg-secondary text-cream" : "bg-muted/40 text-foreground"
                        }`}>
                          <c.i className="w-4 h-4" />
                        </div>
                        <span className="text-[12px] font-medium">{c.k}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-medium">Invite members</h3>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Optional — you can invite people later too.
                  </p>

                  {/* Search + free-text entry */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && search.trim()) {
                            e.preventDefault();
                            addInvitee(search.trim());
                          }
                        }}
                        placeholder="Search or type a @handle"
                        className="w-full glass rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/40"
                      />
                    </div>
                    <button
                      onClick={() => search.trim() && addInvitee(search.trim())}
                      disabled={!search.trim()}
                      className="px-3 rounded-full bg-primary text-primary-foreground text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>

                  {/* Suggested (from follow graph) */}
                  {filteredSuggestions.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                        From who you follow
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredSuggestions.map((h) => (
                          <button
                            key={h}
                            onClick={() => addInvitee(h)}
                            className="text-[11px] glass rounded-full px-2.5 py-1 hover:bg-muted/60 transition flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> @{h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invitee list with role pickers */}
                  {invitees.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {invitees.length} invited
                      </div>
                      {invitees.map((inv) => (
                        <div
                          key={inv.handle}
                          className="rounded-2xl glass p-2.5 flex items-center gap-2.5"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-cream font-display text-xs shrink-0 uppercase">
                            {inv.handle.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">@{inv.handle}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {ROLES.find((r) => r.k === inv.role)?.desc}
                            </div>
                          </div>
                          <select
                            value={inv.role}
                            onChange={(e) => setInviteeRole(inv.handle, e.target.value as Role)}
                            className="text-[11px] glass rounded-full px-2 py-1 outline-none bg-background"
                            aria-label={`Role for @${inv.handle}`}
                          >
                            {ROLES.map((r) => (
                              <option key={r.k} value={r.k} className="capitalize">
                                {r.k}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeInvitee(inv.handle)}
                            className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground"
                            aria-label={`Remove @${inv.handle}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {invitees.length === 0 && filteredSuggestions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto opacity-50 mb-2" />
                      <div className="text-sm">No invitees yet</div>
                      <div className="text-[11px] mt-0.5">
                        Type a handle above or follow more people to see suggestions.
                      </div>
                    </div>
                  )}
                </section>
              )}

              {step === 4 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings2 className="w-4 h-4 text-secondary" />
                    <h3 className="text-sm font-medium">Settings</h3>
                  </div>
                  <Toggle
                    label="Require approval to join"
                    desc="Owners/admins must approve new members."
                    checked={joinApproval}
                    onChange={setJoinApproval}
                  />
                  <Toggle
                    label="Members can post"
                    desc="When off, only admins/moderators can publish."
                    checked={membersCanPost}
                    onChange={setMembersCanPost}
                  />
                  <Toggle
                    label="Members can share media"
                    desc="Photos, videos, and voice notes."
                    checked={membersCanShareMedia}
                    onChange={setMembersCanShareMedia}
                  />
                  <Toggle
                    label="Members can invite"
                    desc="Members can send their own invitations."
                    checked={membersCanInvite}
                    onChange={setMembersCanInvite}
                  />
                  <Toggle
                    label="Members can create events"
                    desc="Calendar events inside the Circle."
                    checked={membersCanCreateEvents}
                    onChange={setMembersCanCreateEvents}
                  />

                  {/* Summary card */}
                  <div className="mt-3 rounded-2xl bg-secondary/5 border border-secondary/30 p-3 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Summary
                    </div>
                    <div className="text-sm font-medium truncate">{name || "Untitled Circle"}</div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <Pill icon={MODES.find((m) => m.k === mode)!.i} label={mode} />
                      <Pill icon={CATEGORIES.find((c) => c.k === category)!.i} label={category} />
                      <Pill icon={Users} label={`${invitees.length + 1} member${invitees.length ? "s" : ""}`} />
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Footer — back / next / create */}
            <footer
              className="px-5 py-3 border-t border-border/60 flex items-center gap-3"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
            >
              <button
                onClick={() => (step === 0 ? onClose() : setStep((s) => Math.max(0, s - 1)))}
                className="px-4 py-2.5 rounded-full glass text-sm flex items-center gap-1.5 hover:bg-muted/60 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                {step === 0 ? "Cancel" : "Back"}
              </button>
              <div className="flex-1" />
              {step < TOTAL_STEPS - 1 ? (
                <button
                  onClick={() => canAdvance && setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                  disabled={!canAdvance}
                  className="px-5 py-2.5 rounded-full bg-gradient-hero text-cream text-sm font-medium flex items-center gap-1.5 shadow-float disabled:opacity-50 transition"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={create}
                  disabled={creating}
                  className="px-5 py-2.5 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center gap-1.5 shadow-float disabled:opacity-50 transition"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {creating ? "Creating..." : "Create Circle"}
                </button>
              )}
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────

function stepTitle(step: number): string {
  return ["Basics", "Visibility", "Category", "Invite", "Settings"][step] ?? "";
}

function Toggle({
  label, desc, checked, onChange,
}: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full text-left rounded-2xl glass p-3 flex items-start gap-3 hover:bg-muted/40 transition"
      role="switch"
      aria-checked={checked}
    >
      <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${
        checked ? "bg-secondary" : "bg-muted"
      }`}>
        <div className={`w-5 h-5 rounded-full bg-cream shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </button>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass capitalize">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
