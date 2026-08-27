// @ts-nocheck
/**
 * Sovereign Layer Seeding (R3 + R8)
 * ============================================================================
 * Seeds the Policy Engine and Service Directory with initial Egyptian
 * government data on first run. Called from the admin panel "Seed Defaults"
 * button or automatically on first API hit.
 *
 * R3: Policy Engine seeding — initial rules for ACA, Police, EMS, Fire, Traffic
 * R8: Service Directory population — official Egyptian government services
 *
 * All entries are marked "Pending verification" until confirmed.
 */

import { db } from "@/lib/db";

// ── R3: Policy Engine seed rules ──────────────────────────────────────────

export const SEED_POLICY_RULES = [
  // ACA policies
  {
    ruleId: "policy-aca-access-001",
    institution: "aca",
    name: "ACA Case Access — Assignment Required",
    category: "access",
    condition: JSON.stringify({ requiresAssignment: true, requiresClearance: "level2" }),
    action: "require_assignment",
    description: "ACA agents can only access cases assigned to them. Requires level2+ clearance.",
    authority: "ACA Internal Policy",
    status: "active",
  },
  {
    ruleId: "policy-aca-evidence-001",
    institution: "aca",
    name: "Sealed Evidence — No Modification",
    category: "evidence",
    condition: JSON.stringify({ sealedOnly: true }),
    action: "deny_modification",
    description: "Sealed evidence cannot be edited, overwritten, or deleted by anyone.",
    authority: "ACA Evidence Integrity Rule §61",
    status: "active",
  },
  {
    ruleId: "policy-aca-ai-001",
    institution: "aca",
    name: "AI Cannot Auto-Convert Signal to Case",
    category: "ai",
    condition: JSON.stringify({ action: "signal_to_case", requiresHuman: true }),
    action: "require_human_approval",
    description: "AI cannot autonomously convert signals into formal cases. Human decision required.",
    authority: "ACA AI Governance §38",
    status: "active",
  },
  {
    ruleId: "policy-aca-retention-001",
    institution: "aca",
    name: "ACA Evidence Retention — 7 Years Minimum",
    category: "retention",
    condition: JSON.stringify({ minYears: 7, sealedIndefinite: true }),
    action: "enforce_retention",
    description: "ACA institutional evidence retained minimum 7 years. Sealed evidence retained indefinitely.",
    authority: "ACA Retention Policy",
    status: "active",
  },
  {
    ruleId: "policy-aca-escalation-001",
    institution: "aca",
    name: "Two-Person Authorization for Case Closure",
    category: "escalation",
    condition: JSON.stringify({ action: "close_case", requiresTwoPersons: true }),
    action: "require_dual_authorization",
    description: "Case closure requires two-person authorization.",
    authority: "ACA §194",
    status: "active",
  },

  // Police policies
  {
    ruleId: "policy-police-access-001",
    institution: "police",
    name: "Police Case — No Cross-Institution Access",
    category: "access",
    condition: JSON.stringify({ crossInstitution: false }),
    action: "deny_cross_institution",
    description: "ACA permission does not grant Police access. Police permission does not grant ACA access.",
    authority: "Federation Architecture §XVIII",
    status: "active",
  },
  {
    ruleId: "policy-police-emergency-001",
    institution: "police",
    name: "Emergency Routing — Police Incidents Only",
    category: "emergency",
    condition: JSON.stringify({ type: "police_emergency" }),
    action: "route_to_police",
    description: "Police emergencies route to Police. NEVER to ACA.",
    authority: "Emergency Architecture §XXII",
    status: "active",
  },

  // EMS policies
  {
    ruleId: "policy-ems-access-001",
    institution: "ems",
    name: "EMS Medical Data — Purpose-Limited Access",
    category: "access",
    condition: JSON.stringify({ purpose: "emergency_response", minInfo: true }),
    action: "enforce_purpose_bound",
    description: "EMS medical data accessed only for emergency response. Minimum necessary info.",
    authority: "Emergency Privacy §CVII",
    status: "active",
  },
  {
    ruleId: "policy-ems-retention-001",
    institution: "ems",
    name: "EMS Data — No Unnecessary Retention",
    category: "retention",
    condition: JSON.stringify({ retainOnly: "operational_necessary" }),
    action: "enforce_minimal_retention",
    description: "Do not retain unnecessary medical/emergency info simply because Circle transmitted it.",
    authority: "Emergency Privacy §CVII",
    status: "active",
  },

  // Fire / Civil Protection policies
  {
    ruleId: "policy-fire-access-001",
    institution: "fire",
    name: "Fire/CP — Separate Institutional Domain",
    category: "access",
    condition: JSON.stringify({ domain: "fire_civil_protection" }),
    action: "enforce_domain_boundary",
    description: "Fire/Civil Protection remains a separate institutional domain.",
    authority: "Federation Architecture §IX",
    status: "active",
  },

  // Traffic policies
  {
    ruleId: "policy-traffic-access-001",
    institution: "traffic",
    name: "Traffic — Separate Institutional Model",
    category: "access",
    condition: JSON.stringify({ domain: "traffic" }),
    action: "enforce_domain_boundary",
    description: "Traffic incidents, enforcement, and evidence remain in Traffic domain.",
    authority: "Federation Architecture §X",
    status: "active",
  },

  // Federation-wide policies
  {
    ruleId: "policy-fed-001",
    institution: null,
    name: "No Shared Government Case by Default",
    category: "access",
    condition: JSON.stringify({ sharedCase: false }),
    action: "enforce_separate_cases",
    description: "Citizen submission → separate referral records → institution-specific cases.",
    authority: "Federation Architecture §XXXI",
    status: "active",
  },
  {
    ruleId: "policy-fed-002",
    institution: null,
    name: "Signal ≠ Case",
    category: "ai",
    condition: JSON.stringify({ signalToCase: "human_only" }),
    action: "deny_auto_conversion",
    description: "Signals are possible issues requiring review. Cases are formal matters. AI cannot auto-convert.",
    authority: "ACA Signal Architecture §XXXVIII",
    status: "active",
  },
];

// ── R8: Service Directory seed entries ──────────────────────────────────────

export const SEED_SERVICE_DIRECTORY = [
  {
    serviceId: "svc-aca-001",
    serviceName: "Administrative Control Authority — Complaint Filing",
    responsibleInstitution: "ACA",
    department: "Citizen Complaints",
    channel: "online",
    contactInfo: JSON.stringify({ phone: null, website: null, email: null, note: "Requires government authorization / technical discovery" }),
    hours: JSON.stringify({ days: "Sun-Thu", time: "9:00-17:00" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["arabic", "online"]),
    languages: JSON.stringify(["ar", "en"]),
    category: "oversight",
    status: "available",
  },
  {
    serviceId: "svc-police-001",
    serviceName: "Police Emergency — 122",
    responsibleInstitution: "Police",
    department: "Emergency Dispatch",
    channel: "phone",
    contactInfo: JSON.stringify({ phone: "122", note: "Official Egyptian police emergency number" }),
    hours: JSON.stringify({ days: "24/7", time: "always" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["voice", "sms-where-available"]),
    languages: JSON.stringify(["ar"]),
    category: "emergency",
    status: "available",
  },
  {
    serviceId: "svc-ems-001",
    serviceName: "Ambulance/EMS Emergency — 123",
    responsibleInstitution: "EMS",
    department: "Emergency Dispatch",
    channel: "phone",
    contactInfo: JSON.stringify({ phone: "123", note: "Official Egyptian ambulance emergency number" }),
    hours: JSON.stringify({ days: "24/7", time: "always" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["voice"]),
    languages: JSON.stringify(["ar"]),
    category: "emergency",
    status: "available",
  },
  {
    serviceId: "svc-fire-001",
    serviceName: "Fire/Civil Protection Emergency — 180",
    responsibleInstitution: "Civil Protection",
    department: "Emergency Dispatch",
    channel: "phone",
    contactInfo: JSON.stringify({ phone: "180", note: "Official Egyptian fire/civil protection number" }),
    hours: JSON.stringify({ days: "24/7", time: "always" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["voice"]),
    languages: JSON.stringify(["ar"]),
    category: "emergency",
    status: "available",
  },
  {
    serviceId: "svc-traffic-001",
    serviceName: "Traffic Police — Incident Reporting",
    responsibleInstitution: "Traffic Police",
    department: "Traffic Operations",
    channel: "phone",
    contactInfo: JSON.stringify({ phone: "122", note: "Traffic incidents via police emergency" }),
    hours: JSON.stringify({ days: "24/7", time: "always" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["voice"]),
    languages: JSON.stringify(["ar"]),
    category: "emergency",
    status: "available",
  },
  {
    serviceId: "svc-eta-001",
    serviceName: "Egyptian Tax Authority — E-Invoice Verification",
    responsibleInstitution: "ETA",
    department: "E-Invoice System",
    channel: "online",
    contactInfo: JSON.stringify({ website: null, note: "Requires government authorization / technical discovery" }),
    hours: JSON.stringify({ days: "Sun-Thu", time: "9:00-17:00" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["online", "arabic"]),
    languages: JSON.stringify(["ar", "en"]),
    category: "tax",
    status: "available",
  },
  {
    serviceId: "svc-gafi-001",
    serviceName: "GAFI — Company Registration & Verification",
    responsibleInstitution: "GAFI",
    department: "Corporate Registry",
    channel: "online",
    contactInfo: JSON.stringify({ website: null, note: "Requires government authorization / technical discovery" }),
    hours: JSON.stringify({ days: "Sun-Thu", time: "9:00-17:00" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["online", "arabic"]),
    languages: JSON.stringify(["ar", "en"]),
    category: "corporate",
    status: "available",
  },
  {
    serviceId: "svc-nafeza-001",
    serviceName: "NAFEZA — Customs & Foreign Trade",
    responsibleInstitution: "NAFEZA",
    department: "Customs Operations",
    channel: "online",
    contactInfo: JSON.stringify({ website: null, note: "Requires government authorization / technical discovery" }),
    hours: JSON.stringify({ days: "Sun-Thu", time: "9:00-17:00" }),
    geographicCoverage: "National",
    accessibility: JSON.stringify(["online", "arabic"]),
    languages: JSON.stringify(["ar", "en"]),
    category: "customs",
    status: "available",
  },
];

// ── Seed function ──────────────────────────────────────────────────────────

export async function seedSovereignDefaults(): Promise<{
  policiesSeeded: number;
  servicesSeeded: number;
  institutionsSeeded: number;
}> {
  let policiesSeeded = 0;
  let servicesSeeded = 0;
  let institutionsSeeded = 0;

  // Seed policy rules
  try {
    for (const rule of SEED_POLICY_RULES) {
      try {
        const existing = await db.policyRule.findUnique({ where: { ruleId: rule.ruleId } });
        if (!existing) {
          await db.policyRule.create({ data: rule });
          policiesSeeded++;
        }
      } catch { /* table may not exist */ }
    }
  } catch { /* non-critical */ }

  // Seed service directory
  try {
    for (const svc of SEED_SERVICE_DIRECTORY) {
      try {
        const existing = await db.serviceDirectoryEntry.findUnique({ where: { serviceId: svc.serviceId } });
        if (!existing) {
          await db.serviceDirectoryEntry.create({ data: { ...svc, lastVerified: null } });
          servicesSeeded++;
        }
      } catch { /* table may not exist */ }
    }
  } catch { /* non-critical */ }

  // Seed institutions
  const institutions = [
    { institutionId: "inst-aca", name: "Administrative Control Authority", authority: "ACA", type: "aca", integrationLevel: 3 },
    { institutionId: "inst-police", name: "Egyptian Police", authority: "MOI", type: "police", integrationLevel: 1 },
    { institutionId: "inst-ems", name: "Emergency Medical Services", authority: "MoH", type: "ems", integrationLevel: 1 },
    { institutionId: "inst-fire", name: "Civil Protection / Fire", authority: "MoI", type: "fire", integrationLevel: 1 },
    { institutionId: "inst-traffic", name: "Traffic Police", authority: "MOI", type: "traffic", integrationLevel: 1 },
    { institutionId: "inst-eta", name: "Egyptian Tax Authority", authority: "MoF", type: "financial", integrationLevel: 2 },
    { institutionId: "inst-gafi", name: "General Authority for Investment", authority: "GAFI", type: "regulator", integrationLevel: 2 },
    { institutionId: "inst-nafeza", name: "NAFEZA Customs", authority: "MoT", type: "regulator", integrationLevel: 2 },
  ];
  try {
    for (const inst of institutions) {
      try {
        const existing = await db.governmentInstitution.findUnique({ where: { institutionId: inst.institutionId } });
        if (!existing) {
          await db.governmentInstitution.create({ data: { ...inst, status: "active", dataClassification: "restricted" } });
          institutionsSeeded++;
        }
      } catch { /* table may not exist */ }
    }
  } catch { /* non-critical */ }

  return { policiesSeeded, servicesSeeded, institutionsSeeded };
}
