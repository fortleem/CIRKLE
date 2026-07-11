"use client";

/**
 * Pro Network overlay — Blueprint §14 (LinkedIn replacement).
 *
 * Four tabs:
 *   1. Jobs     — list of job postings with filters (country, type, search),
 *                 "Post a job" composer, click to view details + apply.
 *   2. Profile  — professional profile editor (headline, summary, skills,
 *                 experience, education, availability).
 *   3. Network  — view your endorsements + endorse a user for a skill.
 *   4. Salary   — anonymous salary insights by role + country.
 *
 * Open via the `circle:pro-network` event (registered in page.tsx +
 * overlay-registry.ts).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Briefcase,
  User as UserIcon,
  Network as NetworkIcon,
  BarChart3,
  RefreshCw,
  Loader2,
  Plus,
  Search,
  MapPin,
  Building2,
  Clock,
  Banknote,
  Send,
  Star,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// ─────────────────────────────────────────────────────────────────────────────

type TabView = "jobs" | "profile" | "network" | "salary";
const TABS: { id: TabView; label: string; icon: LucideIcon }[] = [
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "network", label: "Network", icon: NetworkIcon },
  { id: "salary", label: "Salary", icon: BarChart3 },
];

const JOB_TYPES = ["full-time", "part-time", "contract", "internship"] as const;

const COUNTRY_OPTIONS: { code: string; name: string }[] = [
  { code: "ALL", name: "All countries" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "EG", name: "Egypt" },
  { code: "AE", name: "UAE" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "CN", name: "China" },
  { code: "RU", name: "Russia" },
  { code: "BR", name: "Brazil" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "TR", name: "Türkiye" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
];

// ── API shapes ──────────────────────────────────────────────────────────────

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  type: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description: string;
  requirements: string;
  postedBy: string;
  createdAt: string;
}

interface ExperienceEntry {
  role: string;
  company: string;
  start: string;
  end?: string;
  description?: string;
}

interface EducationEntry {
  school: string;
  degree: string;
  start: string;
  end?: string;
}

interface ProProfile {
  username: string;
  headline?: string | null;
  summary?: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  availability: string;
  createdAt: string;
  updatedAt: string;
}

interface SalaryInsight {
  country: string;
  role: string;
  p25: number;
  p50: number;
  p75: number;
  count: number;
  currency: string;
}

interface EndorsementGroup {
  skill: string;
  count: number;
  endorsers: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProNetwork({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username || "guest";
  const [tab, setTab] = useState<TabView>("jobs");

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Professional Network — jobs, profiles, endorsements, salary insights"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-border/40 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Professional Network</h1>
            <p className="text-[11px] text-muted-foreground">
              Jobs · profiles · endorsements · anonymous salary insights. Free forever.
            </p>
          </div>
          <FeedbackButton overlayName="Pro Network" />
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Tab strip */}
        <div className="max-w-4xl mx-auto mt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabView)}>
            <TabsList className="w-full sm:w-auto overflow-x-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "jobs" && <JobsTab username={username} country={user?.country} />}
            {tab === "profile" && <ProfileTab username={username} />}
            {tab === "network" && <NetworkTab username={username} />}
            {tab === "salary" && <SalaryTab defaultCountry={user?.country} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Jobs tab
// ─────────────────────────────────────────────────────────────────────────────

function JobsTab({ username, country }: { username: string; country?: string }) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>(country || "ALL");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCountry !== "ALL") params.set("country", filterCountry);
      if (filterType !== "all") params.set("type", filterType);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/jobs?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { jobs: JobPosting[] };
      setJobs(data.jobs || []);
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Failed to load jobs.");
      setError(msg);
      toast.error("Couldn't load jobs", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [filterCountry, filterType, search]);

  useEffect(() => {
    const t = setTimeout(() => void fetchJobs(), 250);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  return (
    <section className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies, skills…"
              className="pl-9"
              aria-label="Search jobs"
            />
          </div>
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by country">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {JOB_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            size="sm"
            className="shrink-0"
            onClick={() => setComposerOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Post a job
          </Button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {loading ? "Loading…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
          </span>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
            aria-label="Refresh jobs"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Job list */}
      {error && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Couldn&apos;t load jobs.</p>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-2xl border border-border/60 p-10 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No jobs match your filters. Try posting one — it&apos;s free.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onApply={() => setSelectedJob(job)} />
        ))}
      </div>

      {/* Composer */}
      <AnimatePresence>
        {composerOpen && (
          <PostJobDialog
            username={username}
            defaultCountry={country || ""}
            onClose={() => setComposerOpen(false)}
            onPosted={() => {
              setComposerOpen(false);
              void fetchJobs();
              toast.success("Job posted", {
                description: "Your listing is now visible to the network.",
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* Apply dialog */}
      <AnimatePresence>
        {selectedJob && (
          <ApplyDialog
            job={selectedJob}
            username={username}
            onClose={() => setSelectedJob(null)}
            onApplied={() => {
              setSelectedJob(null);
              toast.success("Application sent", {
                description: `Applied to ${selectedJob.title} @ ${selectedJob.company}`,
              });
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function JobCard({ job, onApply }: { job: JobPosting; onApply: () => void }) {
  const salary = useMemo(() => {
    if (job.salaryMin == null && job.salaryMax == null) return null;
    const cur = job.currency || "";
    if (job.salaryMin != null && job.salaryMax != null) {
      return `${cur} ${formatNum(job.salaryMin)} – ${formatNum(job.salaryMax)}`;
    }
    const v = job.salaryMin ?? job.salaryMax ?? 0;
    return `${cur} ${formatNum(v)}${job.salaryMin == null ? " max" : ""}`;
  }, [job]);

  return (
    <article className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 hover:border-border transition">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/10 border border-border/40 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="font-display text-base leading-tight">{job.title}</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
              {job.type}
            </span>
          </div>
          <p className="text-sm text-foreground/80 mt-0.5">{job.company}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location || "—"}
              {job.country && (
                <span className="font-mono ms-0.5">· {job.country}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(job.createdAt)}
            </span>
            {salary && (
              <span className="inline-flex items-center gap-1 text-secondary">
                <Banknote className="w-3 h-3" />
                {salary}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {job.description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="default" onClick={onApply}>
              <Send className="w-3.5 h-3.5 mr-1" />
              Apply
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Posted by @{job.postedBy}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function PostJobDialog({
  username,
  defaultCountry,
  onClose,
  onPosted,
}: {
  username: string;
  defaultCountry: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    country: defaultCountry || "",
    type: "full-time",
    salaryMin: "",
    salaryMax: "",
    currency: "SAR",
    description: "",
    requirements: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    if (!form.title.trim() || !form.company.trim()) {
      toast.error("Title and company are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          company: form.company,
          location: form.location,
          country: form.country,
          type: form.type,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          currency: form.currency || null,
          description: form.description,
          requirements: form.requirements,
          postedBy: username,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      onPosted();
    } catch (e) {
      toast.error("Couldn't post job", {
        description: String((e as Error).message || e),
      });
    } finally {
      setSaving(false);
    }
  }, [form, username, onPosted]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-charcoal/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-float w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Post a job"
      >
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="font-display text-lg">Post a job</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Title *">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Backend Engineer"
            />
          </Field>
          <Field label="Company *">
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Cirkle Labs"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Riyadh, KSA"
              />
            </Field>
            <Field label="Country (ISO-2)">
              <Input
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value.toUpperCase().slice(0, 2) })
                }
                placeholder="SA"
              />
            </Field>
          </div>
          <Field label="Type">
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Salary min">
              <Input
                type="number"
                value={form.salaryMin}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                placeholder="8000"
              />
            </Field>
            <Field label="Salary max">
              <Input
                type="number"
                value={form.salaryMax}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                placeholder="14000"
              />
            </Field>
            <Field label="Currency">
              <Input
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })
                }
                placeholder="SAR"
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell candidates about the role, team, and impact."
              rows={4}
            />
          </Field>
          <Field label="Requirements">
            <Textarea
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="5+ years of TypeScript, distributed systems, etc."
              rows={3}
            />
          </Field>
        </div>
        <div className="px-5 py-4 border-t border-border/60 flex items-center justify-end gap-2 sticky bottom-0 bg-card">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Post job
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ApplyDialog({
  job,
  username,
  onClose,
  onApplied,
}: {
  job: JobPosting;
  username: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, coverLetter }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      onApplied();
    } catch (e) {
      toast.error("Couldn't apply", {
        description: String((e as Error).message || e),
      });
    } finally {
      setSaving(false);
    }
  }, [job.id, username, coverLetter, onApplied]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-charcoal/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-float w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`Apply to ${job.title}`}
      >
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <h2 className="font-display text-lg truncate">{job.title}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {job.company} · {job.location || "Remote"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-muted/40 p-3 text-sm">
            <p className="font-medium mb-1">Role description</p>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {job.description || "No description provided."}
            </p>
            {job.requirements && (
              <>
                <p className="font-medium mt-3 mb-1">Requirements</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {job.requirements}
                </p>
              </>
            )}
          </div>
          <Field label="Cover letter (optional)">
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself — why are you a great fit?"
              rows={5}
            />
          </Field>
        </div>
        <div className="px-5 py-4 border-t border-border/60 flex items-center justify-end gap-2 sticky bottom-0 bg-card">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Send application
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile tab
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab({ username }: { username: string }) {
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pro/profile?username=${encodeURIComponent(username)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ProProfile;
      setProfile({
        ...data,
        skills: Array.isArray(data.skills) ? data.skills : [],
        experience: Array.isArray(data.experience) ? data.experience : [],
        education: Array.isArray(data.education) ? data.education : [],
      });
    } catch (e) {
      toast.error("Couldn't load profile", {
        description: String((e as Error).message || e),
      });
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) void fetchProfile();
  }, [username, fetchProfile]);

  const save = useCallback(
    async (patch: Partial<ProProfile>) => {
      setSaving(true);
      try {
        const res = await fetch("/api/pro/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, ...patch }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { profile: ProProfile };
        setProfile(data.profile);
      } catch (e) {
        toast.error("Couldn't save profile", {
          description: String((e as Error).message || e),
        });
      } finally {
        setSaving(false);
      }
    },
    [username],
  );

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  const p = profile || {
    username,
    headline: null,
    summary: null,
    skills: [],
    experience: [],
    education: [],
    availability: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v) return;
    if (p.skills.includes(v.toLowerCase())) {
      setSkillInput("");
      return;
    }
    void save({ skills: [...p.skills, v.toLowerCase()] });
    setSkillInput("");
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/30 to-primary/15 border border-border/40 flex items-center justify-center shrink-0">
            <UserIcon className="w-7 h-7 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg">@{p.username}</p>
            <p className="text-xs text-muted-foreground">
              Member since {new Date(p.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Field label="Headline">
          <Input
            value={p.headline || ""}
            onChange={(e) => setProfile({ ...p, headline: e.target.value })}
            onBlur={() => save({ headline: p.headline })}
            placeholder="Senior Backend Engineer @ Cirkle Labs"
          />
        </Field>
        <Field label="Summary">
          <Textarea
            value={p.summary || ""}
            onChange={(e) => setProfile({ ...p, summary: e.target.value })}
            onBlur={() => save({ summary: p.summary })}
            placeholder="A short bio — who you are and what you build."
            rows={3}
          />
        </Field>
        <Field label="Availability">
          <Select
            value={p.availability}
            onValueChange={(v) => {
              setProfile({ ...p, availability: v });
              void save({ availability: v });
            }}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">🟢 Open to work</SelectItem>
              <SelectItem value="looking">🟡 Looking</SelectItem>
              <SelectItem value="closed">🔴 Closed</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Skills */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            Skills
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {p.skills.length} skill{p.skills.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="TypeScript, React, distributed systems…"
          />
          <Button size="sm" onClick={addSkill} disabled={saving}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {p.skills.length === 0 ? (
          <p className="text-xs text-muted-foreground">No skills yet — add your first one above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary"
              >
                {s}
                <button
                  onClick={() => void save({ skills: p.skills.filter((x) => x !== s) })}
                  className="ms-1 text-secondary/70 hover:text-secondary"
                  aria-label={`Remove ${s}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Experience
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void save({
                experience: [
                  ...p.experience,
                  { role: "New role", company: "", start: "", end: "" },
                ],
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {p.experience.length === 0 ? (
          <p className="text-xs text-muted-foreground">No experience entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {p.experience.map((exp, i) => (
              <li
                key={i}
                className="rounded-xl border border-border/40 p-3 text-sm space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{exp.role || "Untitled role"}</span>
                  <button
                    onClick={() =>
                      void save({ experience: p.experience.filter((_, j) => j !== i) })
                    }
                    className="text-muted-foreground hover:text-accent"
                    aria-label="Remove entry"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {exp.company || "—"} · {exp.start || "?"} → {exp.end || "now"}
                </p>
                {exp.description && (
                  <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Education */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Education
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void save({
                education: [
                  ...p.education,
                  { school: "New school", degree: "", start: "", end: "" },
                ],
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {p.education.length === 0 ? (
          <p className="text-xs text-muted-foreground">No education entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {p.education.map((edu, i) => (
              <li
                key={i}
                className="rounded-xl border border-border/40 p-3 text-sm space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{edu.school || "Untitled school"}</span>
                  <button
                    onClick={() =>
                      void save({ education: p.education.filter((_, j) => j !== i) })
                    }
                    className="text-muted-foreground hover:text-accent"
                    aria-label="Remove entry"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {edu.degree || "—"} · {edu.start || "?"} → {edu.end || "now"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {saving && (
        <p className="text-[11px] text-muted-foreground text-center">
          <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
          Saving…
        </p>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Network tab — endorsements
// ─────────────────────────────────────────────────────────────────────────────

function NetworkTab({ username }: { username: string }) {
  const [endorsements, setEndorsements] = useState<EndorsementGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [skill, setSkill] = useState("");
  const [endorsing, setEndorsing] = useState(false);

  const fetchEndorsements = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/pro/endorse?target=<username> returns the endorsements
      // received by the target user, grouped by skill. Endorsements are
      // public — anyone can see who endorsed whom.
      const res = await fetch(
        `/api/pro/endorse?target=${encodeURIComponent(username)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { endorsements?: EndorsementGroup[] };
      setEndorsements(Array.isArray(data.endorsements) ? data.endorsements : []);
    } catch {
      // Best-effort — endorsements are optional data.
      setEndorsements([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void fetchEndorsements();
  }, [fetchEndorsements]);

  const endorse = useCallback(async () => {
    if (!target.trim() || !skill.trim()) {
      toast.error("Target username and skill are required.");
      return;
    }
    setEndorsing(true);
    try {
      const res = await fetch("/api/pro/endorse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          skill: skill.trim(),
          endorser: username,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success("Endorsed!", {
        description: `Endorsed @${target.trim()} for ${skill.trim()}.`,
      });
      setTarget("");
      setSkill("");
    } catch (e) {
      toast.error("Couldn't endorse", {
        description: String((e as Error).message || e),
      });
    } finally {
      setEndorsing(false);
    }
  }, [target, skill, username]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 via-secondary/5 to-transparent p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <NetworkIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base">Your network</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Endorse the people you&apos;ve worked with. Endorsements are public,
              one-per-skill-per-user, and idempotent.
            </p>
          </div>
        </div>
      </div>

      {/* Endorse someone */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <h3 className="font-display text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-secondary" />
          Endorse a skill
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Username (e.g. layla)"
            aria-label="Target username"
          />
          <Input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Skill (e.g. TypeScript)"
            aria-label="Skill"
          />
        </div>
        <Button size="sm" onClick={endorse} disabled={endorsing}>
          {endorsing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Star className="w-4 h-4 mr-1" />
          )}
          Endorse
        </Button>
      </div>

      {/* My endorsements */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Endorsements you&apos;ve received
          </h3>
          <button
            onClick={fetchEndorsements}
            disabled={loading}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            aria-label="Refresh endorsements"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
        {loading && endorsements.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : endorsements.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No endorsements yet. Ask a colleague to vouch for your skills!
          </p>
        ) : (
          <ul className="space-y-2">
            {endorsements.map((e) => (
              <li
                key={e.skill}
                className="rounded-xl border border-border/40 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">{e.skill}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Endorsed by {e.endorsers.map((u) => `@${u}`).join(", ")}
                  </p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary shrink-0">
                  ×{e.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Salary tab
// ─────────────────────────────────────────────────────────────────────────────

function SalaryTab({ defaultCountry }: { defaultCountry?: string }) {
  const [country, setCountry] = useState(defaultCountry || "SA");
  const [role, setRole] = useState("engineer");
  const [insight, setInsight] = useState<SalaryInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = useCallback(async () => {
    if (!country || !role.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pro/salary?country=${encodeURIComponent(country)}&role=${encodeURIComponent(role.trim())}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SalaryInsight;
      setInsight(data);
    } catch (e) {
      const msg = String((e as Error).message || e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [country, role]);

  useEffect(() => {
    const t = setTimeout(() => void fetchInsight(), 250);
    return () => clearTimeout(t);
  }, [fetchInsight]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/15 via-primary/5 to-transparent p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base">Anonymous salary insights</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Percentiles computed from salaries posted on Cirkle job listings.
              No personal salary data is ever stored — only the aggregate bands.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-full" aria-label="Country">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.filter((c) => c.code !== "ALL").map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role keyword (e.g. engineer, designer, manager)"
            aria-label="Role"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {loading
              ? "Computing…"
              : insight
                ? `${insight.count} data point${insight.count === 1 ? "" : "s"} · ${insight.currency}`
                : "Ready"}
          </span>
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label="Recompute"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            Recompute
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Couldn&apos;t compute insights.</p>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {insight && !error && (
        <div className="grid grid-cols-3 gap-3">
          <SalaryBand label="25th percentile" value={insight.p25} currency={insight.currency} tint="from-steel/20 to-steel/5 border-steel/40" />
          <SalaryBand label="Median" value={insight.p50} currency={insight.currency} tint="from-secondary/25 to-secondary/5 border-secondary/40" highlight />
          <SalaryBand label="75th percentile" value={insight.p75} currency={insight.currency} tint="from-primary/20 to-primary/5 border-primary/40" />
        </div>
      )}

      {insight && insight.count === 0 && !error && (
        <div className="rounded-2xl border border-border/60 p-6 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No salary data yet for <span className="font-mono">{role}</span> in
            <span className="font-mono"> {country}</span>. Post a job with a salary
            range to help the network learn.
          </p>
        </div>
      )}
    </section>
  );
}

function SalaryBand({
  label,
  value,
  currency,
  tint,
  highlight,
}: {
  label: string;
  value: number;
  currency: string;
  tint: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4 text-center", tint)}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-display mt-1",
          highlight ? "text-2xl text-secondary" : "text-xl",
        )}
      >
        {value > 0 ? formatNum(value) : "—"}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{currency}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "just now";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
