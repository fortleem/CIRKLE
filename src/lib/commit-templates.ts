// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit — Agreement Templates Library (U5)
//
// A curated, country-aware library of agreement templates that pre-fill the
// Create form via a 3-question wizard. Categories cover the most common
// peer-to-peer commitments Cirkle users make (NDA, freelance, rental, loan,
// service SLA, partnership, employment, generic business).
//
// Country codes: ISO-2 (EG, SA, AE, US, GB) or "universal" when the template
// is jurisdiction-agnostic. Each template ships with a description, conditions,
// an optional suggested amount range, and an optional duration hint.
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateCategory =
  | "business"
  | "freelance"
  | "rental"
  | "loan"
  | "service"
  | "nda"
  | "partnership"
  | "employment";

export interface AgreementTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** ISO-2 country code, or "universal" when jurisdiction-agnostic. */
  country: string;
  description: string;
  emoji: string;
  template: {
    title: string;
    description: string;
    conditions: string[];
    suggestedAmount?: { min: number; max: number; currency: string };
    duration?: string;
  };
}

/** Country labels for the filter chips + template cards. */
export const TEMPLATE_COUNTRIES: { code: string; label: string; flag: string }[] = [
  { code: "universal", label: "Universal", flag: "🌍" },
  { code: "EG", label: "Egypt", flag: "🇪🇬" },
  { code: "SA", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "AE", label: "UAE", flag: "🇦🇪" },
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
];

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; emoji: string }[] = [
  { id: "nda", label: "NDA", emoji: "🔒" },
  { id: "freelance", label: "Freelance", emoji: "💼" },
  { id: "rental", label: "Rental", emoji: "🏠" },
  { id: "loan", label: "Loan", emoji: "💵" },
  { id: "service", label: "Service SLA", emoji: "🤝" },
  { id: "partnership", label: "Partnership", emoji: "👥" },
  { id: "employment", label: "Employment", emoji: "🧑‍💼" },
  { id: "business", label: "Business", emoji: "📦" },
];

export const AGREEMENT_TEMPLATES: AgreementTemplate[] = [
  // ── NDA (4) ──────────────────────────────────────────────────────────────
  {
    id: "tpl-nda-eg",
    name: "Non-Disclosure Agreement (Egypt)",
    category: "nda",
    country: "EG",
    description: "Egyptian law NDA for business confidentiality between two parties.",
    emoji: "🔒",
    template: {
      title: "Non-Disclosure Agreement",
      description:
        "Mutual NDA governed by Egyptian law (Civil Code arts. 145–150). Each party agrees to keep confidential information secret for 3 years from disclosure date.",
      conditions: [
        "Confidential information includes trade secrets, source code, customer lists, and financial data",
        "Recipient shall not disclose information to any third party without prior written consent",
        "Obligations survive 3 years from the termination of discussions",
        "Breach triggers liquidated damages of 100,000 EGP per incident",
        "Governing law: Arab Republic of Egypt · Cairo courts jurisdiction",
      ],
      duration: "3 years confidentiality",
    },
  },
  {
    id: "tpl-nda-sa",
    name: "Non-Disclosure Agreement (Saudi Arabia)",
    category: "nda",
    country: "SA",
    description: "Saudi-law NDA aligned with Sharīʿah-compliant commercial practice.",
    emoji: "🔒",
    template: {
      title: "Non-Disclosure Agreement (KSA)",
      description:
        "Mutual NDA governed by Saudi commercial law and Sharīʿah principles. Confidentiality survives 5 years from the date of last disclosure.",
      conditions: [
        "Confidential information covers technical, commercial, and financial data",
        "Each party shall implement reasonable security measures",
        "Survival period: 5 years from last disclosure",
        "Liquidated damages: 75,000 SAR per breach (gharmin — compensation, not penalty)",
        "Disputes resolved through Saudi Center for Commercial Arbitration (SCCA)",
      ],
      duration: "5 years confidentiality",
    },
  },
  {
    id: "tpl-nda-ae",
    name: "Non-Disclosure Agreement (UAE)",
    category: "nda",
    country: "AE",
    description: "UAE Federal-law NDA suitable for mainland and free-zone companies.",
    emoji: "🔒",
    template: {
      title: "Non-Disclosure Agreement (UAE)",
      description:
        "Mutual NDA governed by UAE Federal Law. Includes explicit carve-outs for information that becomes public through no fault of the recipient.",
      conditions: [
        "Confidential info includes business plans, IP, and customer data",
        "Standard carve-outs: publicly available, independently developed, or rightfully received from a third party",
        "Survival: 5 years post-termination",
        "Liquidated damages: 50,000 AED per incident",
        "Governing law: UAE · DIAC arbitration",
      ],
      duration: "5 years confidentiality",
    },
  },
  {
    id: "tpl-nda-universal",
    name: "Non-Disclosure Agreement (Universal)",
    category: "nda",
    country: "universal",
    description: "Jurisdiction-neutral NDA for cross-border collaborations.",
    emoji: "🔒",
    template: {
      title: "Mutual Non-Disclosure Agreement",
      description:
        "Balanced mutual NDA without a specific governing law. Use when parties operate across multiple jurisdictions.",
      conditions: [
        "Mutual confidentiality obligations — both parties disclose and receive",
        "Standard exceptions for independently developed or public information",
        "Survival period: 3 years from disclosure",
        "Return or destruction of materials on written request",
        "Dispute resolution: arbitration in the recipient's home jurisdiction",
      ],
      duration: "3 years confidentiality",
    },
  },

  // ── Freelance (3) ────────────────────────────────────────────────────────
  {
    id: "tpl-freelance-eg",
    name: "Freelance Development Contract (Egypt)",
    category: "freelance",
    country: "EG",
    description: "Software / design freelance contract under Egyptian law with milestone payments.",
    emoji: "💼",
    template: {
      title: "Freelance Services Agreement",
      description:
        "Project-based freelance contract for software development, design, or content creation. Includes scope, milestones, IP transfer on final payment.",
      conditions: [
        "Scope defined in attached Statement of Work (SOW)",
        "Payment in 3 milestones: 30% upfront, 40% on beta, 30% on delivery",
        "Two rounds of revisions included; further revisions billed hourly at 250 EGP/hr",
        "Intellectual property transfers to client on final payment",
        "Late delivery beyond 7 days of agreed deadline triggers 5% discount per week",
      ],
      suggestedAmount: { min: 8000, max: 40000, currency: "EGP" },
      duration: "4–8 weeks typical",
    },
  },
  {
    id: "tpl-freelance-sa",
    name: "Freelance Design Contract (Saudi Arabia)",
    category: "freelance",
    country: "SA",
    description: "Sharīʿah-compliant ijārah (lease-of-services) freelance contract.",
    emoji: "💼",
    template: {
      title: "Freelance Ijārah Agreement",
      description:
        "Saudi freelance contract structured as ijārah (service lease). Scope, deliverables, and payment schedule specified; VAT-exclusive amounts.",
      conditions: [
        "Deliverables specified in SOW with acceptance criteria",
        "50% upfront in escrow, 50% on delivery",
        "Source files handed over on final payment",
        "Free revisions: 2 rounds; further revisions at 150 SAR/hr",
        "Governing law: KSA · disputes via SCCA",
      ],
      suggestedAmount: { min: 1500, max: 12000, currency: "SAR" },
      duration: "2–6 weeks typical",
    },
  },
  {
    id: "tpl-freelance-universal",
    name: "Freelance Contract (Universal)",
    category: "freelance",
    country: "universal",
    description: "Jurisdiction-neutral freelance contract for cross-border work.",
    emoji: "💼",
    template: {
      title: "Freelance Services Contract",
      description:
        "Cross-border freelance agreement with milestone-based escrow. Currency and governing law chosen by parties at signing.",
      conditions: [
        "Scope defined in SOW with measurable acceptance criteria",
        "Milestone payments held in Cirkle escrow until acceptance",
        "Two revision rounds included",
        "IP transfers to client on final payment",
        "Either party may terminate with 7 days' notice; completed work paid pro-rata",
      ],
      suggestedAmount: { min: 200, max: 3000, currency: "USD" },
      duration: "2–8 weeks typical",
    },
  },

  // ── Rental (4) ────────────────────────────────────────────────────────────
  {
    id: "tpl-rental-eg",
    name: "Apartment Lease (Egypt)",
    category: "rental",
    country: "EG",
    description: "Residential apartment lease under Egyptian rent law.",
    emoji: "🏠",
    template: {
      title: "Residential Lease Agreement",
      description:
        "Furnished/unfurnished residential lease governed by Egyptian Law 4/1996. Annual term with automatic renewal unless terminated with notice.",
      conditions: [
        "Lease term: 12 months, renewable",
        "Security deposit: 2 months' rent, refundable within 30 days of vacating",
        "Rent paid quarterly in advance",
        "Tenant pays utilities (electricity, water, gas, internet)",
        "No subletting without written landlord consent",
        "Maintenance: landlord covers structural; tenant covers daily-use repairs under 500 EGP",
      ],
      suggestedAmount: { min: 6000, max: 25000, currency: "EGP" },
      duration: "12 months",
    },
  },
  {
    id: "tpl-rental-sa",
    name: "Apartment Lease (Saudi Arabia)",
    category: "rental",
    country: "SA",
    description: "Residential lease registered via Saudi Ejar platform.",
    emoji: "🏠",
    template: {
      title: "Residential Lease (Ejar)",
      description:
        "Residential lease registered through the Saudi Ejar platform. Rent paid quarterly or annually; landlord provides documented building permit.",
      conditions: [
        "Lease term: 12 months (Hijri or Gregorian)",
        "Rent paid quarterly in advance via SADAD",
        "Security deposit: 1 month's rent, refundable within 15 days",
        "Tenant pays utilities (SEWA / SEC / water)",
        "Maintenance: landlord covers major; tenant covers minor (<500 SAR)",
        "Registered via Ejar · eviction per Saudi rental law",
      ],
      suggestedAmount: { min: 18000, max: 90000, currency: "SAR" },
      duration: "12 months",
    },
  },
  {
    id: "tpl-rental-ae",
    name: "Apartment Lease (UAE)",
    category: "rental",
    country: "AE",
    description: "Residential lease registered via Ejari / Tawtheeq.",
    emoji: "🏠",
    template: {
      title: "Residential Lease (Ejari)",
      description:
        "UAE residential lease registered via Ejari (Dubai) or Tawtheeq (Abu Dhabi). Standard 1-cheque or 4-cheque payment plans.",
      conditions: [
        "Lease term: 12 months, renewable with 90 days' notice",
        "Rent paid via 1 or 4 post-dated cheques",
        "Security deposit: 5% (unfurnished) or 10% (furnished)",
        "Tenant pays DEWA / ADDC + cooling + internet",
        "Maintenance: landlord covers structural; tenant covers minor (<1,000 AED)",
        "Registered via Ejari / Tawtheeq · RERA dispute resolution",
      ],
      suggestedAmount: { min: 40000, max: 180000, currency: "AED" },
      duration: "12 months",
    },
  },
  {
    id: "tpl-rental-universal",
    name: "Short-term Rental (Universal)",
    category: "rental",
    country: "universal",
    description: "Short-term / vacation rental agreement between peers.",
    emoji: "🏠",
    template: {
      title: "Short-term Rental Agreement",
      description:
        "Peer-to-peer short-term rental for vacation or temporary stays. Daily/weekly pricing, escrow-secured.",
      conditions: [
        "Stay duration: agreed check-in / check-out dates",
        "Damage deposit: 10% of total, refunded within 48 hours of checkout",
        "Payment: 50% on booking, 50% on check-in",
        "No smoking inside; pets only with prior approval",
        "Guest count must not exceed agreed maximum",
        "Host provides clean linens and functional amenities",
      ],
      suggestedAmount: { min: 50, max: 400, currency: "USD" },
      duration: "1–30 days",
    },
  },

  // ── Loan (3) ─────────────────────────────────────────────────────────────
  {
    id: "tpl-loan-sa",
    name: "Personal Loan (Saudi Arabia)",
    category: "loan",
    country: "SA",
    description: "Sharīʿah-compliant personal loan (qard ḥasan) between individuals.",
    emoji: "💵",
    template: {
      title: "Qard Ḥasan Loan Agreement",
      description:
        "Interest-free benevolent loan (qard ḥasan) between two individuals, governed by Saudi law and Sharīʿah. Repayment schedule agreed by both parties.",
      conditions: [
        "Loan amount disbursed on signing",
        "Zero interest (riba-free) — Sharīʿah-compliant",
        "Repayment: monthly instalments over agreed term",
        "Late payment: borrower may give optional ṣadaqah to charity (no penalty to lender)",
        "Borrower may repay early without fee",
        "Disputes via SCCA arbitration",
      ],
      suggestedAmount: { min: 1000, max: 50000, currency: "SAR" },
      duration: "3–24 months",
    },
  },
  {
    id: "tpl-loan-universal",
    name: "Personal Loan (Universal)",
    category: "loan",
    country: "universal",
    description: "Peer-to-peer personal loan with simple interest and escrow.",
    emoji: "💵",
    template: {
      title: "Personal Loan Agreement",
      description:
        "Peer-to-peer personal loan with optional simple interest. Principal held in escrow and released on signing; repayments auto-collected.",
      conditions: [
        "Principal disbursed on signing via Cirkle escrow",
        "Interest rate: 0–8% APR (negotiated)",
        "Repayment schedule: monthly equal instalments",
        "Grace period: 7 days; thereafter 1% late fee per week (capped at principal)",
        "Early repayment: no penalty",
        "Default: lender may initiate dispute resolution",
      ],
      suggestedAmount: { min: 100, max: 10000, currency: "USD" },
      duration: "3–36 months",
    },
  },
  {
    id: "tpl-loan-us",
    name: "Promissory Note (United States)",
    category: "loan",
    country: "US",
    description: "US-style promissory note between two private parties.",
    emoji: "💵",
    template: {
      title: "Promissory Note",
      description:
        "Simple promissory note between private parties under US state law. Lump-sum or instalment repayment; secured or unsecured.",
      conditions: [
        "Borrower promises to pay principal plus agreed interest",
        "Repayment: monthly amortised instalments",
        "Annual interest rate not exceeding state usury cap",
        "Default: lender may accelerate full balance",
        "Governing law: lender's state of residence",
      ],
      suggestedAmount: { min: 200, max: 25000, currency: "USD" },
      duration: "6–60 months",
    },
  },

  // ── Service SLA (2) ──────────────────────────────────────────────────────
  {
    id: "tpl-service-sla-universal",
    name: "Service Level Agreement (Universal)",
    category: "service",
    country: "universal",
    description: "SLA for ongoing service delivery with uptime + response commitments.",
    emoji: "🤝",
    template: {
      title: "Service Level Agreement",
      description:
        "Service Level Agreement for ongoing managed services. Includes uptime guarantee, response-time tiers, and service credits.",
      conditions: [
        "Service uptime target: 99.5% monthly",
        "Response time: Critical ≤ 1h · High ≤ 4h · Normal ≤ 24h",
        "Service credit: 10% of monthly fee per 1% below uptime target",
        "Monthly fee held in Cirkle escrow, released on acceptance",
        "Termination: 30 days' notice from either party",
      ],
      suggestedAmount: { min: 200, max: 5000, currency: "USD" },
      duration: "Monthly recurring",
    },
  },
  {
    id: "tpl-service-sla-sa",
    name: "Service SLA (Saudi Arabia)",
    category: "service",
    country: "SA",
    description: "Saudi-law SLA with quarterly invoicing in SAR.",
    emoji: "🤝",
    template: {
      title: "Service Level Agreement (KSA)",
      description:
        "Service Level Agreement for ongoing managed services in Saudi Arabia. Quarterly invoicing, VAT-exclusive.",
      conditions: [
        "Uptime target: 99.5% monthly",
        "Response: Critical ≤ 1h · High ≤ 4h · Normal ≤ 24h",
        "Service credit: 10% of quarterly fee per 1% below uptime",
        "Invoiced quarterly in advance, VAT 15% added",
        "Termination: 30 days' notice; SCCA arbitration",
      ],
      suggestedAmount: { min: 1500, max: 25000, currency: "SAR" },
      duration: "Quarterly recurring",
    },
  },

  // ── Partnership (2) ──────────────────────────────────────────────────────
  {
    id: "tpl-partnership-ae",
    name: "Partnership Agreement (UAE)",
    category: "partnership",
    country: "AE",
    description: "UAE partnership agreement for a 2-person LLC or civil company.",
    emoji: "👥",
    template: {
      title: "Partnership Agreement (UAE)",
      description:
        "Partnership agreement for two parties forming a UAE LLC or civil company. Covers capital contribution, profit-sharing, and exit.",
      conditions: [
        "Capital contribution split: 50/50 (or as amended)",
        "Profit / loss sharing: pro-rata to capital contribution",
        "Management: both partners as joint signatories",
        "Exit: right of first refusal; valuation by independent auditor",
        "Non-compete for 12 months post-exit within UAE",
        "Governing law: UAE · DIAC arbitration",
      ],
      suggestedAmount: { min: 50000, max: 500000, currency: "AED" },
      duration: "Indefinite (until exit)",
    },
  },
  {
    id: "tpl-partnership-universal",
    name: "Joint Venture (Universal)",
    category: "partnership",
    country: "universal",
    description: "Jurisdiction-neutral joint-venture for time-bound projects.",
    emoji: "👥",
    template: {
      title: "Joint Venture Agreement",
      description:
        "Joint venture for a defined project between two parties. Each party contributes resources; profits split per agreed ratio.",
      conditions: [
        "Each party contributes capital / assets / labour per SOW",
        "Profit split: 50/50 (or as amended)",
        "Decision-making: unanimous on material matters",
        "Term: until project completion or 24 months, whichever earlier",
        "Exit: buy-out by either party at fair valuation",
        "Disputes: arbitration in neutral jurisdiction",
      ],
      suggestedAmount: { min: 1000, max: 100000, currency: "USD" },
      duration: "Until project completion",
    },
  },

  // ── Employment (3) ───────────────────────────────────────────────────────
  {
    id: "tpl-employment-eg",
    name: "Employment Contract (Egypt)",
    category: "employment",
    country: "EG",
    description: "Egyptian Labour Law (Law 12/2003) employment contract.",
    emoji: "🧑‍💼",
    template: {
      title: "Employment Contract (Egypt)",
      description:
        "Employment contract under Egyptian Labour Law 12/2003. Includes probation, notice, and end-of-service entitlements.",
      conditions: [
        "Probation period: 3 months (max)",
        "Working hours: 8/day · 48/week",
        "Annual leave: 21 days (rising to 30 after 10 years' service)",
        "Notice period: 2 months (resignation) / per law (termination)",
        "End-of-service: ½ month salary per year for first 5 years; 1 month thereafter",
        "Social insurance: deducted per Egyptian Social Insurance Law",
      ],
      suggestedAmount: { min: 6000, max: 40000, currency: "EGP" },
      duration: "Indefinite (subject to probation)",
    },
  },
  {
    id: "tpl-employment-sa",
    name: "Employment Contract (Saudi Arabia)",
    category: "employment",
    country: "SA",
    description: "Saudi Labour Law contract — includes iqama + EOSB terms.",
    emoji: "🧑‍💼",
    template: {
      title: "Employment Contract (KSA)",
      description:
        "Employment contract under Saudi Labour Law. Includes sponsorship (iqama), working hours, leave, and end-of-service benefits (EOSB).",
      conditions: [
        "Probation: up to 90 days (extendable to 180)",
        "Working hours: 8/day · 48/week (Ramadan: 6/day for Muslim workers)",
        "Annual leave: 21 days (rising to 30 after 5 years)",
        "Employer sponsors iqama + renewal fees",
        "EOSB: ½ month salary per year (first 5 years) · 1 month thereafter",
        "GOSI deductions per Saudi Social Insurance Law",
        "Termination per Saudi Labour Law articles 75–84",
      ],
      suggestedAmount: { min: 4000, max: 25000, currency: "SAR" },
      duration: "Indefinite (subject to probation)",
    },
  },
  {
    id: "tpl-employment-gb",
    name: "Employment Contract (United Kingdom)",
    category: "employment",
    country: "GB",
    description: "UK employment contract under Employment Rights Act 1996.",
    emoji: "🧑‍💼",
    template: {
      title: "Employment Contract (UK)",
      description:
        "UK employment contract compliant with the Employment Rights Act 1996. Includes statutory leave, pension auto-enrolment, and notice.",
      conditions: [
        "Probation: 3 months (extendable to 6)",
        "Working hours: 40/week (incl. 1h unpaid lunch)",
        "Annual leave: 28 days (incl. bank holidays)",
        "Notice: 1 week per year of service (statutory minimum)",
        "Pension auto-enrolment: 5% employee · 3% employer",
        "Right to work in the UK verified before start",
      ],
      suggestedAmount: { min: 22000, max: 80000, currency: "GBP" },
      duration: "Indefinite (subject to probation)",
    },
  },

  // ── Business (2) ─────────────────────────────────────────────────────────
  {
    id: "tpl-business-sale-universal",
    name: "Asset Sale Agreement (Universal)",
    category: "business",
    country: "universal",
    description: "Sale-of-asset agreement between two private parties.",
    emoji: "📦",
    template: {
      title: "Asset Sale Agreement",
      description:
        "Simple asset-sale agreement between two parties. Asset condition, payment, and warranty terms specified.",
      conditions: [
        "Asset description: model, serial, condition (see SOW)",
        "Payment: 50% on signing, 50% on delivery (escrow-secured)",
        "Inspection window: 7 days from delivery",
        "Warranty: 30 days against hidden defects",
        "Title transfers on full payment",
        "Risk passes on delivery",
      ],
      suggestedAmount: { min: 100, max: 10000, currency: "USD" },
      duration: "Until delivery + inspection",
    },
  },
  {
    id: "tpl-business-group-buy-universal",
    name: "Group Buy Agreement (Universal)",
    category: "business",
    country: "universal",
    description: "Group purchase agreement splitting cost + ownership between parties.",
    emoji: "🛒",
    template: {
      title: "Group Buy Agreement",
      description:
        "Group-purchase agreement between N parties. Each contributes a share of the price; ownership / access rights are split accordingly.",
      conditions: [
        "Each party's contribution and ownership share listed in SOW",
        "Total price held in Cirkle escrow until all parties have paid",
        "Refund if the group does not reach full funding by deadline",
        "Ownership / usage split per contribution ratio",
        "Resale requires unanimous consent; proceeds split per ratio",
        "Disputes: mediation, then arbitration",
      ],
      suggestedAmount: { min: 20, max: 2000, currency: "USD" },
      duration: "Until delivery + 30-day warranty",
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Map a template category onto CirkleCommit's CommitType (price | work | service | rental | group_buy). */
export function templateToCommitType(category: TemplateCategory): "price" | "work" | "service" | "rental" | "group_buy" {
  switch (category) {
    case "rental":
      return "rental";
    case "loan":
    case "business":
      return "price";
    case "service":
      return "service";
    case "group_buy": // unreachable given our categories, but TS-safe
      return "group_buy";
    case "freelance":
    case "nda":
    case "partnership":
    case "employment":
    default:
      return "work";
  }
}

/** Find a template by id (defensive — returns undefined if not found). */
export function findTemplate(id: string): AgreementTemplate | undefined {
  return AGREEMENT_TEMPLATES.find((t) => t.id === id);
}

/** Country label + flag for a template's country code. */
export function templateCountryMeta(code: string): { label: string; flag: string } {
  const found = TEMPLATE_COUNTRIES.find((c) => c.code === code);
  return found ?? { label: code, flag: "🌍" };
}
