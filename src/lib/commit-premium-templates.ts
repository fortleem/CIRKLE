// @ts-nocheck
/**
 * Premium Commit Templates (D2).
 *
 * A separate concept from the existing `commit-templates.ts` (which is a
 * static, country-aware agreement library). This module adds a freemium
 * template gallery: free basic templates + premium templates locked behind
 * a $5/mo subscription. Each premium template body uses {{placeholders}}.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, all, nowISO } from "@/lib/feature-store";

export type TemplateCategory =
  | "nda"
  | "employment"
  | "lease"
  | "freelance"
  | "partnership"
  | "sale";

export interface CommitTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  isPremium: boolean;
  body: string;
  description: string;
  createdAt: string;
}

const STORE = "commitTemplate";

/** Seed the gallery on first access — 6 templates covering each category. */
const SEED_TEMPLATES: CommitTemplate[] = [
  {
    id: "tpl_free_nda",
    name: "Basic Mutual NDA",
    category: "nda",
    isPremium: false,
    description: "A simple, jurisdiction-neutral mutual NDA for early-stage discussions.",
    body:
      "This Mutual Non-Disclosure Agreement is entered into between {{partyA}} and {{partyB}} on {{date}}. " +
      "Both parties agree to keep confidential any proprietary information disclosed for the purpose of {{purpose}}. " +
      "Obligations survive for 3 years from disclosure.",
    createdAt: nowISO(),
  },
  {
    id: "tpl_free_freelance",
    name: "Basic Freelance Contract",
    category: "freelance",
    isPremium: false,
    description: "Plain-language freelance agreement with milestone payments.",
    body:
      "Service agreement between {{client}} (Client) and {{freelancer}} (Freelancer) for {{deliverable}}. " +
      "Total fee: {{amount}} {{currency}}. Milestones: 30% upfront, 40% on beta, 30% on delivery.",
    createdAt: nowISO(),
  },
  {
    id: "tpl_premium_nda_gold",
    name: "Cross-Border M&A NDA (Premium)",
    category: "nda",
    isPremium: true,
    description: "Premium NDA for cross-border M&A discussions with arbitration clauses.",
    body:
      "Premium Cross-Border NDA — {{partyA}} and {{partyB}} agree that all M&A-related information shared during {{dealName}} " +
      "shall remain confidential for 5 years. Includes ICC arbitration clause, liquidated damages of {{penalty}}, and " +
      "specific carve-outs for affiliate disclosures under {{governingLaw}}.",
    createdAt: nowISO(),
  },
  {
    id: "tpl_premium_employment_exec",
    name: "Executive Employment Contract (Premium)",
    category: "employment",
    isPremium: true,
    description: "Senior-executive employment contract with equity + garden leave.",
    body:
      "Executive Employment Agreement — {{employer}} (Employer) and {{employee}} (Employee). " +
      "Position: {{title}}. Base salary: {{salary}} {{currency}} per annum. Equity grant: {{equity}}. " +
      "Notice: {{noticeWeeks}} weeks. Garden leave: {{gardenLeaveWeeks}} weeks. Non-compete: {{nonCompeteMonths}} months.",
    createdAt: nowISO(),
  },
  {
    id: "tpl_premium_lease_commercial",
    name: "Commercial Lease (Premium)",
    category: "lease",
    isPremium: true,
    description: "Commercial property lease with CPI rent escalation + renewal options.",
    body:
      "Commercial Lease — Landlord {{landlord}} leases the premises at {{address}} to Tenant {{tenant}} for {{termYears}} years. " +
      "Annual rent: {{rent}} {{currency}}, escalating annually by CPI (cap 4%). Renewal options: {{renewalOptions}}. " +
      "Security deposit: {{deposit}} {{currency}}.",
    createdAt: nowISO(),
  },
  {
    id: "tpl_premium_partnership_jv",
    name: "Joint Venture Agreement (Premium)",
    category: "partnership",
    isPremium: true,
    description: "JV for time-bound projects with profit-sharing and exit clauses.",
    body:
      "Joint Venture Agreement between {{partyA}} and {{partyB}} for the project '{{projectName}}'. " +
      "Capital contribution: {{contribA}} / {{contribB}}. Profit split: {{splitA}}% / {{splitB}}%. " +
      "Term: {{term}}. Exit: buy-out at fair valuation, right of first refusal. Disputes: {{arbitration}}.",
    createdAt: nowISO(),
  },
  {
    id: "tpl_premium_sale_goods",
    name: "Sale of Goods Agreement (Premium)",
    category: "sale",
    isPremium: true,
    description: "Bulk goods sale contract with inspection window + warranty.",
    body:
      "Sale of Goods Agreement — Seller {{seller}} agrees to sell {{quantity}} units of {{goods}} to Buyer {{buyer}}. " +
      "Unit price: {{unitPrice}} {{currency}}. Total: {{total}} {{currency}}. Inspection window: {{inspectionDays}} days. " +
      "Warranty: {{warrantyDays}} days against hidden defects. Payment: 50% on signing, 50% on delivery (escrow).",
    createdAt: nowISO(),
  },
];

let _seeded = false;
function ensureSeed() {
  if (_seeded) return;
  _seeded = true;
  for (const t of SEED_TEMPLATES) {
    if (!get<CommitTemplate>(STORE, t.id)) put(STORE, t);
  }
}

export async function getTemplates(category?: TemplateCategory): Promise<CommitTemplate[]> {
  ensureSeed();
  const list = all<CommitTemplate>(STORE);
  if (category) return list.filter((t) => t.category === category);
  return list;
}

export interface InstantiateInput {
  templateId: string;
  values: Record<string, string>;
}

export interface InstantiatedTemplate {
  id: string;
  template: CommitTemplate;
  renderedBody: string;
  createdAt: string;
}

/** Replace every {{placeholder}} in the body. Unknown placeholders are left as-is. */
export async function instantiateTemplate(
  input: InstantiateInput,
): Promise<InstantiatedTemplate> {
  ensureSeed();
  const tpl = get<CommitTemplate>(STORE, input.templateId);
  if (!tpl) throw new Error(`template ${input.templateId} not found`);
  let body = tpl.body;
  for (const [k, v] of Object.entries(input.values || {})) {
    body = body.split(`{{${k}}}`).join(String(v ?? ""));
  }
  return {
    id: `inst_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    template: tpl,
    renderedBody: body,
    createdAt: nowISO(),
  };
}
