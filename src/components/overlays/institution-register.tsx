// @ts-nocheck
/**
 * InstitutionRegister — full-screen 4-step registration wizard for
 * institutions (companies, NGOs, government entities, freelancers).
 *
 * Flow:
 *   Step 0  Founder Verification   — confirms a personal Cirkle account exists.
 *   Step 1  Institution Details    — name, handle, country, type, emails, …
 *   Step 2  Document Upload        — required docs derived from country+type.
 *   Step 3  Review & Submit       — summary, confirmation, POST to API.
 *
 * On success: shows a "pending verification" success screen.
 * On error : surfaces the API message (esp. missing-documents list).
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Upload,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  Plus,
  Trash2,
  Mail,
  Globe,
  Hash,
  Briefcase,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth, cirkleInitials } from "@/lib/auth-store";
import { COMPANY_TYPES, type DocRequirement } from "@/lib/institution-docs";
import { COUNTRIES } from "@/lib/countries";

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

interface UploadedDoc {
  type: string;
  fileName: string;
  fileHash: string;
}

interface InstitutionForm {
  name: string;
  handle: string;
  country: string;
  companyType: string;
  industry: string;
  emails: string[];
  registrationNumber: string;
  taxId: string;
}

const TOTAL_STEPS = 4;
const STEP_TITLES = [
  "Founder Verification",
  "Institution Details",
  "Document Upload",
  "Review & Submit",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_REGEX = /^[a-z0-9_]{3,30}$/;

// Country options — only those with a doc matrix are most useful, but we surface
// every COUNTRIES entry so the founder can still pick their own.
const COUNTRY_OPTIONS = COUNTRIES.map(c => ({
  code: c.code,
  name: c.name,
  arabicName: c.arabicName,
  flag: c.flag,
})).sort((a, b) => a.name.localeCompare(b.name));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a lowercase @handle suggestion from a display name. */
function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/&/g, "and")
    .replace(/[^a-z0-9_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 30);
}

/** Mock a content hash for a chosen file (no upload in this demo). */
function mockFileHash(fileName: string): string {
  let h = 0x811c9dc5;
  const s = `cirkle::${fileName}::${Date.now()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `0x${h.toString(16).padStart(8, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function InstitutionRegister({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, hydrated } = useAuth();

  // Wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Step 1 state — Institution details
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [country, setCountry] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [industry, setIndustry] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [taxId, setTaxId] = useState("");

  // Step 2 state — Documents
  const [requiredDocs, setRequiredDocs] = useState<DocRequirement[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});

  // Step 3 state — Submit
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingDocsError, setMissingDocsError] = useState<
    Array<{ key: string; label: string; labelAr?: string; description?: string }> | null
  >(null);
  const [success, setSuccess] = useState<{
    handle: string;
    name: string;
    verificationStatus: string;
  } | null>(null);

  // Reset everything when the overlay opens (derived-state pattern — no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setStep(0);
    setDirection(1);
    setName("");
    setHandle("");
    setHandleTouched(false);
    setCountry(user?.country || "EG");
    setCompanyType("");
    setIndustry("");
    setEmails([""]);
    setRegistrationNumber("");
    setTaxId("");
    setRequiredDocs([]);
    setDocsLoading(false);
    setDocsError(null);
    setUploadedDocs({});
    setConfirmed(false);
    setSubmitting(false);
    setSubmitError(null);
    setMissingDocsError(null);
    setSuccess(null);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // ── Step validation ──────────────────────────────────────────────────────

  // Step 0: founder verification passes when there is a personal user account.
  const founderVerified = !!user;

  // Step 1: required fields filled.
  const handleValue = handle.trim().toLowerCase();
  const handleValid = HANDLE_REGEX.test(handleValue);
  const validEmails = emails.map(e => e.trim()).filter(e => EMAIL_REGEX.test(e));
  const step1Valid =
    name.trim().length >= 2 && handleValid && !!country && !!companyType;

  // Auto-suggest handle from name (only if user hasn't manually edited it).
  useEffect(() => {
    if (!handleTouched && name) {
      setHandle(suggestHandle(name));
    }
  }, [name, handleTouched]);

  // Step 2: all required docs have a file selected.
  const uploadedCount = requiredDocs.filter(d => uploadedDocs[d.key]).length;
  const step2Valid =
    requiredDocs.length > 0 && uploadedCount === requiredDocs.length;

  // Step 3: confirmation checkbox.
  const step3Valid = confirmed;

  // ── Document requirements fetch ───────────────────────────────────────────
  // Triggered when the user advances from step 1 to step 2 (and when they
  // change country/companyType while on step 2).
  const fetchDocs = useCallback(async (cc: string, ct: string) => {
    if (!cc || !ct) return;
    setDocsLoading(true);
    setDocsError(null);
    try {
      const res = await fetch(
        `/api/institutions/documents-requirements?country=${encodeURIComponent(cc)}&companyType=${encodeURIComponent(ct)}`,
        { headers: { "Cache-Control": "no-store" } },
      );
      const data = await res.json();
      if (!res.ok) {
        setDocsError(typeof data?.error === "string" ? data.error : "Failed to load document requirements.");
        setRequiredDocs([]);
      } else {
        const docs: DocRequirement[] = Array.isArray(data?.requiredDocs) ? data.requiredDocs : [];
        setRequiredDocs(docs);
        // Prune uploaded docs that are no longer required.
        setUploadedDocs(prev => {
          const next: Record<string, UploadedDoc> = {};
          for (const d of docs) {
            if (prev[d.key]) next[d.key] = prev[d.key];
          }
          return next;
        });
      }
    } catch (err) {
      setDocsError("Network error — could not load document requirements.");
      setRequiredDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  // Refetch when country/companyType change while already on the docs step.
  useEffect(() => {
    if (step === 2 && country && companyType) {
      void fetchDocs(country, companyType);
    }
  }, [step, country, companyType, fetchDocs]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (step === 0 && !founderVerified) return;
    if (step === 1 && !step1Valid) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (step === 2 && !step2Valid) {
      toast.error("Please upload all required documents.");
      return;
    }
    if (step >= TOTAL_STEPS - 1) return;
    setDirection(1);
    setStep(s => Math.min(TOTAL_STEPS - 1, s + 1));
    if (step === 1 && country && companyType) {
      void fetchDocs(country, companyType);
    }
  }, [step, founderVerified, step1Valid, step2Valid, country, companyType, fetchDocs]);

  const goBack = useCallback(() => {
    if (step <= 0) return;
    setDirection(-1);
    setStep(s => Math.max(0, s - 1));
  }, [step]);

  // Enter advances to the next step when the current step is valid.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    // Don't hijack Enter when the user is inside a textarea / multiline input.
    const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === "textarea") return;
    if (step === 3) return; // Submit has its own button (Enter could submit accidentally).
    e.preventDefault();
    goNext();
  };

  // ── Email list helpers ─────────────────────────────────────────────────────

  const setEmailAt = (i: number, v: string) => {
    setEmails(prev => prev.map((e, idx) => (idx === i ? v : e)));
  };
  const addEmail = () => setEmails(prev => [...prev, ""]);
  const removeEmail = (i: number) => {
    setEmails(prev => (prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i)));
  };

  // ── File picker ────────────────────────────────────────────────────────────

  const onPickFile = (doc: DocRequirement, file: File | null) => {
    if (!file) return;
    const fileName = file.name;
    const fileHash = mockFileHash(fileName);
    setUploadedDocs(prev => ({
      ...prev,
      [doc.key]: { type: doc.key, fileName, fileHash },
    }));
    toast.success(`Uploaded: ${fileName}`, { description: doc.labelEn });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    if (!user || !step1Valid || !step2Valid || !confirmed) return;
    setSubmitting(true);
    setSubmitError(null);
    setMissingDocsError(null);
    try {
      const payload = {
        founderHandle: user.username,
        name: name.trim(),
        handle: handleValue,
        country: country.toUpperCase(),
        companyType: companyType.toLowerCase(),
        industry: industry.trim(),
        emails: validEmails,
        registrationNumber: registrationNumber.trim() || undefined,
        taxId: taxId.trim() || undefined,
        documents: requiredDocs.map(d => {
          const u = uploadedDocs[d.key];
          return {
            type: d.key,
            fileName: u?.fileName ?? "",
            fileHash: u?.fileHash ?? "",
          };
        }),
      };
      const res = await fetch("/api/institutions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.missingDocs && Array.isArray(data.missingDocs)) {
          setMissingDocsError(data.missingDocs);
          setSubmitError(data?.error || "Missing required documents.");
        } else {
          setSubmitError(
            typeof data?.error === "string"
              ? data.error
              : "Registration failed. Please try again.",
          );
        }
        return;
      }
      setSuccess({
        handle: data?.institution?.handle || handleValue,
        name: data?.institution?.name || name.trim(),
        verificationStatus: data?.institution?.verificationStatus || "pending",
      });
      toast.success("Institution registered!", {
        description: `@${data?.institution?.handle || handleValue} is now pending verification.`,
      });
    } catch (err) {
      setSubmitError("Network error — could not reach the registration server.");
    } finally {
      setSubmitting(false);
    }
  }, [
    user,
    step1Valid,
    step2Valid,
    confirmed,
    name,
    handleValue,
    country,
    companyType,
    industry,
    validEmails,
    registrationNumber,
    taxId,
    requiredDocs,
    uploadedDocs,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Institution registration"
      className="bg-background/95 backdrop-blur-xl"
    >
      <div
        role="document"
        onKeyDown={onKeyDown}
        className="w-full min-h-screen flex flex-col"
      >
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="shrink-0 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl leading-tight">
                Register an Institution
              </h2>
              <p className="text-xs text-muted-foreground">
                تسجيل مؤسسة · Cirkle for organizations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close institution registration"
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ── Step indicator ────────────────────────────────────────────── */}
        {!success && (
          <div className="shrink-0 px-4 sm:px-6 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              {STEP_TITLES.map((title, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <div
                    key={title}
                    className="flex-1 flex items-center gap-2 min-w-0"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                          active
                            ? "bg-emerald-500 text-white"
                            : done
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-white/5 text-muted-foreground border border-white/10"
                        }`}
                      >
                        {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs text-center leading-tight truncate w-full ${
                          active ? "text-emerald-300 font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {title}
                      </span>
                    </div>
                    {i < STEP_TITLES.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 rounded-full ${
                          done ? "bg-emerald-500/40" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Body — animated step content ──────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait" custom={direction}>
              {success ? (
                <SuccessScreen
                  key="success"
                  handle={success.handle}
                  name={success.name}
                  status={success.verificationStatus}
                  onClose={onClose}
                />
              ) : step === 0 ? (
                <StepFounder
                  key="step-0"
                  direction={direction}
                  user={user}
                  hydrated={hydrated}
                  onNext={goNext}
                  onClose={onClose}
                />
              ) : step === 1 ? (
                <StepDetails
                  key="step-1"
                  direction={direction}
                  name={name}
                  setName={setName}
                  handle={handle}
                  setHandle={v => {
                    setHandleTouched(true);
                    setHandle(v);
                  }}
                  handleValid={handleValid}
                  country={country}
                  setCountry={setCountry}
                  companyType={companyType}
                  setCompanyType={setCompanyType}
                  industry={industry}
                  setIndustry={setIndustry}
                  emails={emails}
                  setEmailAt={setEmailAt}
                  addEmail={addEmail}
                  removeEmail={removeEmail}
                  validEmails={validEmails}
                  registrationNumber={registrationNumber}
                  setRegistrationNumber={setRegistrationNumber}
                  taxId={taxId}
                  setTaxId={setTaxId}
                  onNext={goNext}
                  onBack={goBack}
                  nextDisabled={!step1Valid}
                />
              ) : step === 2 ? (
                <StepDocuments
                  key="step-2"
                  direction={direction}
                  docs={requiredDocs}
                  loading={docsLoading}
                  error={docsError}
                  uploadedDocs={uploadedDocs}
                  onPickFile={onPickFile}
                  onRetry={() => fetchDocs(country, companyType)}
                  uploadedCount={uploadedCount}
                  onNext={goNext}
                  onBack={goBack}
                  nextDisabled={!step2Valid}
                />
              ) : (
                <StepReview
                  key="step-3"
                  direction={direction}
                  name={name}
                  handle={handleValue}
                  country={country}
                  companyType={companyType}
                  industry={industry}
                  emails={validEmails}
                  registrationNumber={registrationNumber}
                  taxId={taxId}
                  docs={requiredDocs}
                  uploadedDocs={uploadedDocs}
                  confirmed={confirmed}
                  setConfirmed={setConfirmed}
                  submitting={submitting}
                  submitError={submitError}
                  missingDocsError={missingDocsError}
                  onSubmit={submit}
                  onBack={goBack}
                  submitDisabled={!step3Valid || submitting}
                />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — Founder verification
// ─────────────────────────────────────────────────────────────────────────────

function StepFounder({
  user,
  hydrated,
  onNext,
  onClose,
  direction,
}: {
  user: ReturnType<typeof useAuth.getState>["user"];
  hydrated: boolean;
  onNext: () => void;
  onClose: () => void;
  direction: 1 | -1;
}) {
  // While the auth store is hydrating from localStorage we show a tiny spinner.
  if (!hydrated) {
    return (
      <StepShell direction={direction}>
        <Card>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        </Card>
      </StepShell>
    );
  }

  if (!user) {
    return (
      <StepShell direction={direction}>
        <Card>
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="font-display text-xl mb-2">No personal account found</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              You must register a personal Cirkle account before you can register
              an institution. The founder of an institution is always a personal
              Cirkle user.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </Card>
      </StepShell>
    );
  }

  const initials = cirkleInitials(user);
  const avatarBg =
    user.avatarColor === "rose"
      ? "bg-accent/90"
      : user.avatarColor === "teal"
        ? "bg-emerald-500/90"
        : user.avatarColor === "gold"
          ? "bg-secondary/90"
          : "bg-steel/90";

  return (
    <StepShell direction={direction}>
      <Card>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="font-display text-xl mb-1">Founder verified</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            This institution will be registered under your personal Cirkle
            account. You will appear as the founder & primary administrator.
          </p>

          <div className="w-full max-w-sm glass rounded-xl p-4 flex items-center gap-4 border border-white/10">
            <div
              className={`w-12 h-12 rounded-full ${avatarBg} text-white flex items-center justify-center font-semibold shrink-0`}
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 text-left">
              <div className="font-medium truncate">{user.displayName}</div>
              <div className="text-sm text-muted-foreground truncate">
                @{user.username}
                <span className="text-muted-foreground/60">@cirkle</span>
              </div>
              {user.verified && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Cirkle-Verified
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 w-full max-w-sm">
            <Button
              onClick={onNext}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </StepShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Institution details
// ─────────────────────────────────────────────────────────────────────────────

function StepDetails({
  name,
  setName,
  handle,
  setHandle,
  handleValid,
  country,
  setCountry,
  companyType,
  setCompanyType,
  industry,
  setIndustry,
  emails,
  setEmailAt,
  addEmail,
  removeEmail,
  validEmails,
  registrationNumber,
  setRegistrationNumber,
  taxId,
  setTaxId,
  onNext,
  onBack,
  nextDisabled,
  direction,
}: {
  name: string;
  setName: (v: string) => void;
  handle: string;
  setHandle: (v: string) => void;
  handleValid: boolean;
  country: string;
  setCountry: (v: string) => void;
  companyType: string;
  setCompanyType: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  emails: string[];
  setEmailAt: (i: number, v: string) => void;
  addEmail: () => void;
  removeEmail: (i: number) => void;
  validEmails: string[];
  registrationNumber: string;
  setRegistrationNumber: (v: string) => void;
  taxId: string;
  setTaxId: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  nextDisabled: boolean;
  direction: 1 | -1;
}) {
  return (
    <StepShell direction={direction}>
      <Card>
        <h3 className="font-display text-xl mb-1">Institution details</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Tell us about the organization. Required fields are marked with{" "}
          <span className="text-emerald-400">*</span>.
        </p>

        <div className="grid gap-4">
          {/* Name */}
          <Field
            label="Institution name"
            required
            icon={Building2}
          >
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Cairo Tech Hub"
              aria-label="Institution name"
            />
          </Field>

          {/* Handle */}
          <Field
            label="Institution @handle"
            required
            icon={Hash}
            hint={
              handle && !handleValid
                ? "3–30 chars: lowercase letters, numbers, underscore."
                : `@${handle || "handle"}@cirkle`
            }
            hintTone={handle && !handleValid ? "error" : "muted"}
          >
            <div className="flex items-stretch rounded-md border border-input overflow-hidden focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted/30 border-e border-input">
                @
              </span>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase())}
                placeholder="institution_handle"
                aria-label="Institution handle"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none min-w-0"
              />
              <span className="inline-flex items-center px-3 text-xs text-muted-foreground bg-muted/30 border-s border-input">
                @cirkle
              </span>
            </div>
          </Field>

          {/* Country + Company type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Country" required icon={Globe}>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-full" aria-label="Country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRY_OPTIONS.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="me-2" aria-hidden>
                        {c.flag}
                      </span>
                      {c.name}
                      {c.arabicName ? (
                        <span className="text-muted-foreground ms-1">· {c.arabicName}</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Company type" required icon={Briefcase}>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger className="w-full" aria-label="Company type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMPANY_TYPES.map(c => (
                    <SelectItem key={c.key} value={c.key}>
                      <span>{c.labelEn}</span>
                      <span className="text-muted-foreground ms-1">· {c.labelAr}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Industry */}
          <Field label="Industry (optional)" icon={Briefcase}>
            <Input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Fintech, Education, Logistics"
              aria-label="Industry"
            />
          </Field>

          {/* Registered emails (multi-input) */}
          <div>
            <Label className="mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Registered emails
              <span className="text-xs text-muted-foreground">
                (used to auto-detect sender/receiver in commits)
              </span>
            </Label>
            <div className="flex flex-col gap-2">
              {emails.map((email, i) => {
                const trimmed = email.trim();
                const invalid = trimmed.length > 0 && !EMAIL_REGEX.test(trimmed);
                return (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmailAt(i, e.target.value)}
                      placeholder={`email ${i + 1}@institution.com`}
                      aria-label={`Registered email ${i + 1}`}
                      className={invalid ? "border-rose-500/60" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => removeEmail(i)}
                      aria-label={`Remove email ${i + 1}`}
                      className="w-9 h-9 shrink-0 rounded-md hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addEmail}
                className="self-start text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 mt-1"
              >
                <Plus className="w-4 h-4" /> Add email
              </button>
              <p className="text-xs text-muted-foreground mt-1">
                {validEmails.length} valid email{validEmails.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Registration number + Tax ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Registration number (optional)" icon={Hash}>
              <Input
                value={registrationNumber}
                onChange={e => setRegistrationNumber(e.target.value)}
                placeholder="e.g. CR-123456"
                aria-label="Registration number"
              />
            </Field>
            <Field label="Tax ID (optional)" icon={Hash}>
              <Input
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                placeholder="e.g. VAT-300000000000003"
                aria-label="Tax ID"
              />
            </Field>
          </div>
        </div>

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={nextDisabled}
          nextLabel="Continue"
        />
      </Card>
    </StepShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Document upload
// ─────────────────────────────────────────────────────────────────────────────

function StepDocuments({
  docs,
  loading,
  error,
  uploadedDocs,
  onPickFile,
  onRetry,
  uploadedCount,
  onNext,
  onBack,
  nextDisabled,
  direction,
}: {
  docs: DocRequirement[];
  loading: boolean;
  error: string | null;
  uploadedDocs: Record<string, UploadedDoc>;
  onPickFile: (doc: DocRequirement, file: File | null) => void;
  onRetry: () => void;
  uploadedCount: number;
  onNext: () => void;
  onBack: () => void;
  nextDisabled: boolean;
  direction: 1 | -1;
}) {
  return (
    <StepShell direction={direction}>
      <Card>
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h3 className="font-display text-xl">Document upload</h3>
          {!loading && docs.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {uploadedCount} of {docs.length} uploaded
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Upload the documents required for verification in your country. Files
          are stored locally for this demo (no real upload happens).
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="ms-2 text-sm text-muted-foreground">
              Loading required documents…
            </span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onRetry}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
            No documents required for this combination. You can continue.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[44vh] overflow-y-auto pr-1">
            {docs.map(doc => {
              const uploaded = uploadedDocs[doc.key];
              return (
                <DocumentCard
                  key={doc.key}
                  doc={doc}
                  uploaded={uploaded}
                  onPickFile={file => onPickFile(doc, file)}
                />
              );
            })}
          </div>
        )}

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={nextDisabled || loading}
          nextLabel="Continue"
        />
      </Card>
    </StepShell>
  );
}

function DocumentCard({
  doc,
  uploaded,
  onPickFile,
}: {
  doc: DocRequirement;
  uploaded?: UploadedDoc;
  onPickFile: (file: File | null) => void;
}) {
  const inputId = `doc-input-${doc.key}`;
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        uploaded
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            uploaded
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/10 text-muted-foreground"
          }`}
          aria-hidden
        >
          {uploaded ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{doc.labelEn}</h4>
            {doc.labelAr && (
              <span className="text-xs text-muted-foreground" dir="rtl">
                {doc.labelAr}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {doc.acceptedFormats.map(f => f.toUpperCase()).join(", ")}
            </span>
            <span>·</span>
            <span>Max {doc.maxSizeMb} MB</span>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <label
              htmlFor={inputId}
              aria-label={`Upload ${doc.labelEn}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 border border-white/15 hover:bg-white/10 cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploaded ? "Replace file" : "Choose file"}
            </label>
            <input
              id={inputId}
              type="file"
              className="sr-only"
              accept={doc.acceptedFormats.map(f => `.${f}`).join(",")}
              onChange={e => onPickFile(e.target.files?.[0] ?? null)}
            />
            {uploaded && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[180px]" title={uploaded.fileName}>
                  {uploaded.fileName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Review & submit
// ─────────────────────────────────────────────────────────────────────────────

function StepReview({
  name,
  handle,
  country,
  companyType,
  industry,
  emails,
  registrationNumber,
  taxId,
  docs,
  uploadedDocs,
  confirmed,
  setConfirmed,
  submitting,
  submitError,
  missingDocsError,
  onSubmit,
  onBack,
  submitDisabled,
  direction,
}: {
  name: string;
  handle: string;
  country: string;
  companyType: string;
  industry: string;
  emails: string[];
  registrationNumber: string;
  taxId: string;
  docs: DocRequirement[];
  uploadedDocs: Record<string, UploadedDoc>;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  submitting: boolean;
  submitError: string | null;
  missingDocsError: Array<{ key: string; label: string; labelAr?: string; description?: string }> | null;
  onSubmit: () => void;
  onBack: () => void;
  submitDisabled: boolean;
  direction: 1 | -1;
}) {
  const countryInfo = COUNTRIES.find(c => c.code === country.toUpperCase());
  const companyTypeInfo = COMPANY_TYPES.find(c => c.key === companyType.toLowerCase());

  return (
    <StepShell direction={direction}>
      <Card>
        <h3 className="font-display text-xl mb-1">Review & submit</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please confirm the details below before registering.
        </p>

        {/* Summary */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden divide-y divide-white/10">
          <Row label="Institution name" value={name} />
          <Row
            label="Handle"
            value={
              <span className="font-mono">
                @{handle}@cirkle
              </span>
            }
          />
          <Row
            label="Country"
            value={
              countryInfo ? (
                <span>
                  <span className="me-1" aria-hidden>
                    {countryInfo.flag}
                  </span>
                  {countryInfo.name}
                  {countryInfo.arabicName ? (
                    <span className="text-muted-foreground ms-1">· {countryInfo.arabicName}</span>
                  ) : null}
                </span>
              ) : (
                country
              )
            }
          />
          <Row
            label="Company type"
            value={
              companyTypeInfo ? (
                <span>
                  {companyTypeInfo.labelEn}
                  <span className="text-muted-foreground ms-1">· {companyTypeInfo.labelAr}</span>
                </span>
              ) : (
                companyType
              )
            }
          />
          {industry && <Row label="Industry" value={industry} />}
          {emails.length > 0 ? (
            <Row
              label="Registered emails"
              value={
                <div className="flex flex-wrap gap-1.5">
                  {emails.map((e, i) => (
                    <span
                      key={`${e}-${i}`}
                      className="px-2 py-0.5 text-xs rounded-md bg-white/10 border border-white/10 font-mono"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              }
            />
          ) : null}
          {registrationNumber && <Row label="Registration number" value={registrationNumber} />}
          {taxId && <Row label="Tax ID" value={taxId} />}
          <Row
            label="Documents"
            value={
              <ul className="flex flex-col gap-1 mt-0.5">
                {docs.map(d => {
                  const u = uploadedDocs[d.key];
                  return (
                    <li key={d.key} className="flex items-center gap-2 text-xs">
                      {u ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-muted-foreground">{d.labelEn}</span>
                      {u && (
                        <span className="truncate text-foreground/80" title={u.fileName}>
                          · {u.fileName}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            }
          />
        </div>

        {/* Errors */}
        {submitError && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{submitError}</p>
                {missingDocsError && missingDocsError.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {missingDocsError.map(d => (
                      <li key={d.key} className="text-xs">
                        <span className="font-medium">· {d.label}</span>
                        {d.labelAr && (
                          <span className="text-muted-foreground"> — {d.labelAr}</span>
                        )}
                        {d.description && (
                          <span className="block text-muted-foreground">{d.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation */}
        <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-500"
            aria-label="Confirm accuracy and authorization"
          />
          <span className="text-sm leading-relaxed">
            I confirm that all information is accurate and I am authorized to
            register this institution on its behalf.
          </span>
        </label>

        <StepFooter
          onBack={onBack}
          onNext={onSubmit}
          nextDisabled={submitDisabled}
          nextLabel={
            submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Registering…
              </>
            ) : (
              "Register Institution"
            )
          }
        />
      </Card>
    </StepShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success screen
// ─────────────────────────────────────────────────────────────────────────────

function SuccessScreen({
  handle,
  name,
  status,
  onClose,
}: {
  handle: string;
  name: string;
  status: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="glass border border-white/10 rounded-2xl p-8 text-center"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h3 className="font-display text-2xl mb-2">Institution registered!</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        <span className="font-medium text-foreground">{name}</span> is now
        registered on Cirkle. Documents are pending review — you will be notified
        when verification is complete.
      </p>

      <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Institution handle
        </div>
        <div className="font-mono text-emerald-300 text-lg">
          @{handle}@cirkle
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Loader2 className="w-3 h-3 animate-spin" />
          Verification: {status}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button
          onClick={onClose}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          Done
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared building blocks
// ─────────────────────────────────────────────────────────────────────────────

function StepShell({
  direction,
  children,
}: {
  direction: 1 | -1;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      custom={direction}
      initial={{ opacity: 0, x: direction === 1 ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === 1 ? -40 : 40 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  icon: Icon,
  hint,
  hintTone = "muted",
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  hintTone?: "muted" | "error";
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        {label}
        {required && <span className="text-emerald-400">*</span>}
      </Label>
      {children}
      {hint && (
        <p
          className={`mt-1 text-xs ${
            hintTone === "error" ? "text-rose-400" : "text-muted-foreground"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm break-words">{value}</div>
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
      >
        {nextLabel} {!nextDisabled && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  );
}
