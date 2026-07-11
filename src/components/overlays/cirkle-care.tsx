"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  HeartPulse,
  ShieldCheck,
  Search,
  Plus,
  Pill,
  Bell,
  Phone,
  AlertCircle,
  Footprints,
  Moon,
  Droplets,
  Stethoscope,
  Edit3,
  Check,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";

interface Props {
  open: boolean;
  onClose: () => void;
}

const COMMON_SYMPTOMS = [
  "Headache",
  "Fever",
  "Fatigue",
  "Sore throat",
  "Cough",
  "Nausea",
  "Back pain",
  "Insomnia",
];

interface ConditionResult {
  name: string;
  likelihood: number; // 0-100
  note: string;
}

interface Reminder {
  id: string;
  name: string;
  dose: string;
  time: string;
}

const INITIAL_REMINDERS: Reminder[] = [
  { id: "r1", name: "Vitamin D", dose: "1000 IU", time: "08:00" },
  { id: "r2", name: "Omega-3", dose: "1 capsule", time: "13:00" },
  { id: "r3", name: "Magnesium", dose: "200 mg", time: "21:00" },
];

const MOODS = [
  { emoji: "😄", label: "Great", score: 5, color: "text-gold" },
  { emoji: "🙂", label: "Good", score: 4, color: "text-teal" },
  { emoji: "😐", label: "Okay", score: 3, color: "text-steel" },
  { emoji: "😟", label: "Low", score: 2, color: "text-rose" },
  { emoji: "😢", label: "Rough", score: 1, color: "text-rose" },
];

export function CirkleCare({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>([]);
  const [results, setResults] = useState<ConditionResult[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [mood, setMood] = useState<number | null>(null);
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emergency, setEmergency] = useState({
    conditions: "Asthma (mild, exercise-induced)",
    allergies: "Penicillin, peanuts",
    contact: "User · +966 5x xxx 4321",
  });

  const toggleSymptom = (s: string) => {
    setActiveSymptoms((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
    setResults(null);
  };

  const runCheck = () => {
    const symptoms = activeSymptoms.length > 0 ? activeSymptoms : query.trim() ? [query.trim()] : [];
    if (symptoms.length === 0) {
      toast("Pick or type a symptom", {
        description: "I'll suggest possible causes — not a diagnosis.",
      });
      return;
    }
    const out: ConditionResult[] = mockConditions(symptoms);
    setResults(out);
    toast.success("Symptom check complete", {
      description: "Always confirm with a licensed clinician.",
    });
  };

  const addReminder = () => {
    const id = `r${Date.now()}`;
    setReminders((r) => [
      ...r,
      { id, name: "New medication", dose: "1 tablet", time: "12:00" },
    ]);
    toast("Reminder added", {
      description: "Tap to edit name, dose, and time.",
    });
  };

  const moodInsight = useMemo(() => moodInsightFor(mood), [mood]);

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="CirkleCare — AI Health Companion">
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose to-gold flex items-center justify-center shrink-0 shadow-soft">
                <HeartPulse className="w-5 h-5 text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  CirkleCare
                </div>
                <div className="font-display text-xl truncate">AI Health Companion</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24">
              {/* Privacy banner */}
              <div className="rounded-2xl border border-teal/30 bg-gradient-to-br from-teal/10 to-transparent p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal/15 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-teal" />
                </div>
                <div className="text-[12px] leading-snug">
                  <span className="font-medium">100% on-device.</span>{" "}
                  <span className="text-muted-foreground">
                    Nothing leaves your phone — all checks run locally.
                  </span>
                </div>
              </div>

              {/* 1. Symptom Check */}
              <Section
                icon={Stethoscope}
                title="Symptom Check"
                accent="text-rose"
              >
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-full glass">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setResults(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runCheck();
                    }}
                    placeholder="Type a symptom…"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    aria-label="Symptom search"
                  />
                  <button
                    onClick={runCheck}
                    className="text-[10px] uppercase tracking-widest text-rose hover:opacity-80"
                  >
                    Check
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SYMPTOMS.map((s) => {
                    const on = activeSymptoms.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSymptom(s)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          on
                            ? "border-rose/60 bg-rose/15 text-rose"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {results && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Possible conditions
                      </div>
                      {results.map((r, i) => (
                        <div
                          key={r.name}
                          className="rounded-2xl border border-border/60 bg-card p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{r.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {r.likelihood}% match
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {r.note}
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${r.likelihood}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-rose to-gold"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-start gap-2 rounded-xl bg-rose/10 border border-rose/30 p-2.5 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" />
                        <div className="text-[10px] text-muted-foreground leading-snug">
                          <span className="text-rose font-medium">Not medical advice.</span>{" "}
                          CirkleCare suggestions are informational only — always
                          consult a licensed clinician for diagnosis or treatment.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Section>

              {/* 2. Medication Reminders */}
              <Section
                icon={Pill}
                title="Medication Reminders"
                accent="text-gold"
                action={
                  <button
                    onClick={addReminder}
                    className="text-[10px] uppercase tracking-widest text-gold flex items-center gap-1 hover:opacity-80"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                }
              >
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
                  {reminders.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
                        <Pill className="w-4 h-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.dose}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Bell className="w-3 h-3" /> {r.time}
                      </div>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No reminders yet.
                    </div>
                  )}
                </div>
              </Section>

              {/* 3. Mental Health Check */}
              <Section
                icon={HeartPulse}
                title="Mental Health Check"
                accent="text-rose"
              >
                <div className="text-sm text-muted-foreground">
                  How are you feeling today?
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((m) => {
                    const on = mood === m.score;
                    return (
                      <button
                        key={m.label}
                        onClick={() => setMood(m.score)}
                        className={`rounded-2xl border py-2.5 flex flex-col items-center gap-1 transition ${
                          on
                            ? "border-rose/60 bg-rose/15"
                            : "border-border/60 bg-muted/30 hover:bg-muted/60"
                        }`}
                      >
                        <span className="text-2xl" aria-hidden>
                          {m.emoji}
                        </span>
                        <span
                          className={`text-[10px] ${on ? m.color + " font-medium" : "text-muted-foreground"}`}
                        >
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {moodInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="rounded-2xl border border-rose/30 bg-gradient-to-br from-rose/10 to-transparent p-3 flex items-start gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <span className="text-foreground font-medium">{moodInsight.title} · </span>
                        <span className="text-muted-foreground">{moodInsight.body}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Section>

              {/* 4. Emergency Info */}
              <Section
                icon={Phone}
                title="Emergency Info"
                accent="text-rose"
                action={
                  <button
                    onClick={() => setEditingEmergency((v) => !v)}
                    className="text-[10px] uppercase tracking-widest text-rose flex items-center gap-1 hover:opacity-80"
                  >
                    {editingEmergency ? (
                      <>
                        <Check className="w-3 h-3" /> Done
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3" /> Edit
                      </>
                    )}
                  </button>
                }
              >
                <div className="space-y-2">
                  <EmergencyField
                    label="Medical conditions"
                    value={emergency.conditions}
                    editing={editingEmergency}
                    onChange={(v) => setEmergency((s) => ({ ...s, conditions: v }))}
                  />
                  <EmergencyField
                    label="Allergies"
                    value={emergency.allergies}
                    editing={editingEmergency}
                    onChange={(v) => setEmergency((s) => ({ ...s, allergies: v }))}
                  />
                  <EmergencyField
                    label="Emergency contact"
                    value={emergency.contact}
                    editing={editingEmergency}
                    onChange={(v) => setEmergency((s) => ({ ...s, contact: v }))}
                  />
                </div>
              </Section>

              {/* 5. Health Stats */}
              <Section
                icon={Footprints}
                title="Health Stats"
                accent="text-teal"
              >
                <div className="grid grid-cols-3 gap-3">
                  <StatRing
                    icon={Footprints}
                    label="Steps"
                    value="7,842"
                    sub="of 10,000"
                    pct={78}
                    color="text-teal"
                    gradient="from-teal to-steel"
                  />
                  <StatRing
                    icon={Moon}
                    label="Sleep"
                    value="7h 12m"
                    sub="of 8h"
                    pct={90}
                    color="text-steel"
                    gradient="from-steel to-teal"
                  />
                  <StatRing
                    icon={Droplets}
                    label="Water"
                    value="1.6 L"
                    sub="of 2.5 L"
                    pct={64}
                    color="text-gold"
                    gradient="from-gold to-rose"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground text-center">
                  Today · synced from your phone&apos;s sensors (on-device only).
                </div>
              </Section>

              <div className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  CirkleCare is informational and never replaces professional medical
                  advice, diagnosis, or treatment. In an emergency, call your local
                  emergency number immediately.
                </p>
              </div>
            </div>
    </OverlayShell>
  );
}

function Section({
  icon: Icon,
  title,
  accent,
  action,
  children,
}: {
  icon: typeof Pill;
  title: string;
  accent: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent}`} />
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex-1">
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmergencyField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-transparent outline-none text-sm border-b border-border/60 pb-1"
        />
      ) : (
        <div className="mt-1 text-sm">{value}</div>
      )}
    </div>
  );
}

function StatRing({
  icon: Icon,
  label,
  value,
  sub,
  pct,
  color,
  gradient,
}: {
  icon: typeof Pill;
  label: string;
  value: string;
  sub: string;
  pct: number;
  color: string;
  gradient: string;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="5"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            stroke={`url(#ring-gradient-${label})`}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id={`ring-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                style={{ stopColor: `hsl(var(--${gradientStopA(gradient)}))` }}
              />
              <stop
                offset="100%"
                style={{ stopColor: `hsl(var(--${gradientStopB(gradient)}))` }}
              />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className="text-center">
        <div className="font-display text-sm leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

function gradientStopA(g: string): string {
  if (g.startsWith("from-teal")) return "teal";
  if (g.startsWith("from-steel")) return "steel";
  if (g.startsWith("from-gold")) return "gold";
  return "teal";
}
function gradientStopB(g: string): string {
  if (g.endsWith("to-steel")) return "steel";
  if (g.endsWith("to-teal")) return "teal";
  if (g.endsWith("to-rose")) return "rose";
  return "steel";
}

function mockConditions(symptoms: string[]): ConditionResult[] {
  const joined = symptoms.join(" ").toLowerCase();
  const out: ConditionResult[] = [];

  if (/headache|fatigue|insomnia/.test(joined)) {
    out.push({
      name: "Tension headache",
      likelihood: 68,
      note: "Common with stress, screen time, and poor sleep. Hydration and rest often help.",
    });
  }
  if (/fever|sore throat|cough/.test(joined)) {
    out.push({
      name: "Viral upper-respiratory infection",
      likelihood: 72,
      note: "Usually self-resolving in 5–7 days. Watch for high fever or breathing difficulty.",
    });
  }
  if (/nausea|fatigue/.test(joined)) {
    out.push({
      name: "Mild dehydration",
      likelihood: 54,
      note: "Try electrolytes and small sips of water. Seek care if vomiting persists.",
    });
  }
  if (/back pain/.test(joined)) {
    out.push({
      name: "Muscle strain",
      likelihood: 61,
      note: "Often tied to posture or lifting. Gentle movement and heat can ease symptoms.",
    });
  }
  if (out.length === 0) {
    out.push({
      name: "Non-specific discomfort",
      likelihood: 40,
      note: "Symptoms don't strongly match a single pattern. Track for 48h and re-check.",
    });
  }
  return out.slice(0, 3);
}

function moodInsightFor(score: number | null):
  | { title: string; body: string }
  | null {
  if (score === null) return null;
  if (score >= 4) {
    return {
      title: "Glad you're feeling good",
      body: "Save this energy — try a 5-minute gratitude note or share a kind word with someone in your Circle.",
    };
  }
  if (score === 3) {
    return {
      title: "Steady day",
      body: "A short walk or 10 minutes of sunlight can lift a neutral afternoon. Try the breathing exercise below.",
    };
  }
  return {
    title: "Be gentle with yourself",
    body: "Low days are valid. I've surfaced a 4-minute breathing exercise and a free local counsellor hotline. Reach out to a friend in your Circle if you can.",
  };
}
