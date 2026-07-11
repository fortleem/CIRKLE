/**
 * CIRKLE Brain AI — PCPF Sample Capability Packs
 * ============================================================================
 *
 * Reference implementations of capability packs. These demonstrate the
 * standard pack structure and serve as templates for third-party developers.
 *
 * Three sample packs:
 *   1. Travel Pack — flight search, hotel search, itinerary, visa check
 *   2. Payments Pack — transfer, merchant payment, split bill, QR payment
 *   3. Government Pack — visa, civic reporting, document verification
 *
 * These packs register NEW capabilities (beyond the 37 seeded in Phase 4.5)
 * with pack-specific ids (e.g. "cirkle.travel.book-flight").
 * ============================================================================
 */

import type { CapabilityPack, PackCapability, WorkflowTemplate, PolicyDefinition, LocalizationResource, IntegrationAdapter } from "./types";

// ── Helper: create a simulated executor ──────────────────────────────────

function simulatedExecutor(capabilityId: string): IntegrationAdapter["executor"] {
  return async (inputs) => {
    return { simulated: true, capabilityId, inputs, timestamp: new Date().toISOString() };
  };
}

// ── 1. Travel Capability Pack ────────────────────────────────────────────

const travelCapabilities: PackCapability[] = [
  {
    capabilityId: "cirkle.travel.book-flight",
    name: "Book Flight",
    description: "Book a flight after search",
    category: "travel",
    inputSchema: {
      flightId: { type: "string", required: true, description: "Flight id from search results" },
      passengerName: { type: "string", required: true },
      passport: { type: "string", required: true },
    },
    outputSchema: {
      bookingReference: { type: "string" },
      status: { type: "string" },
    },
    permissions: ["travel:book"],
    dependencies: ["cirkle.travel.check-visa"],
    availability: "available",
    tags: ["flights", "booking", "travel"],
    availableInCountries: ["*"],
    requiresConfirmation: true,
    documentation: "Book a confirmed flight. Requires visa check first.",
  },
  {
    capabilityId: "cirkle.travel.cancel-booking",
    name: "Cancel Booking",
    description: "Cancel an existing flight or hotel booking",
    category: "travel",
    inputSchema: {
      bookingReference: { type: "string", required: true },
      reason: { type: "string" },
    },
    outputSchema: {
      cancelled: { type: "boolean" },
      refundAmount: { type: "number" },
    },
    permissions: ["travel:cancel"],
    dependencies: [],
    availability: "available",
    tags: ["cancel", "booking", "refund"],
    requiresConfirmation: true,
  },
  {
    capabilityId: "cirkle.travel.check-visa",
    name: "Check Visa Requirements",
    description: "Check visa requirements between two countries (pack version with country-specific rules)",
    category: "government",
    inputSchema: {
      passport: { type: "string", required: true },
      destination: { type: "string", required: true },
    },
    outputSchema: {
      required: { type: "boolean" },
      durationDays: { type: "number" },
      visaType: { type: "string" },
    },
    permissions: [],
    dependencies: [],
    availability: "available",
    tags: ["visa", "government", "travel"],
    availableInCountries: ["*"],
    requiresConfirmation: false,
  },
  {
    capabilityId: "cirkle.travel.track-flight",
    name: "Track Flight",
    description: "Track a flight's real-time status",
    category: "travel",
    inputSchema: {
      flightNumber: { type: "string", required: true },
      date: { type: "string", required: true },
    },
    outputSchema: {
      status: { type: "string" },
      departureGate: { type: "string" },
      arrivalGate: { type: "string" },
      delay: { type: "number" },
    },
    permissions: [],
    dependencies: [],
    availability: "available",
    tags: ["flights", "tracking", "real-time"],
    requiresConfirmation: false,
  },
];

const travelWorkflows: WorkflowTemplate[] = [
  {
    templateId: "cirkle.travel.full-trip-template",
    name: "Full Trip Planning",
    description: "Complete trip planning: visa → flights → hotels → itinerary",
    applicableIntent: "plan",
    applicableWorkspace: "travel",
    requiredPermissions: ["travel:book"],
    steps: [
      { capabilityId: "cirkle.travel.check-visa", inputs: { passport: "user.identity.passport", destination: "request.destination" }, optional: false },
      { capabilityId: "cirkle.travel.book-flight", inputs: { flightId: "step-1.flightId", passengerName: "user.identity.name" }, optional: false },
      { capabilityId: "cirkle.travel.track-flight", inputs: { flightNumber: "step-2.flightNumber" }, optional: true },
    ],
  },
];

const travelPolicies: PolicyDefinition[] = [
  {
    policyId: "cirkle.travel.policy.visa-required",
    type: "regulatory-prerequisite",
    description: "Visa must be confirmed before booking flights",
    capabilityId: "cirkle.travel.book-flight",
    rules: { prerequisiteMet: true },
    applicableCountries: ["*"],
    enforcement: "block",
  },
  {
    policyId: "cirkle.travel.policy.refund-window",
    type: "time-window",
    description: "Cancellations only allowed within 24h of booking",
    capabilityId: "cirkle.travel.cancel-booking",
    rules: { allowedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
    applicableCountries: ["*"],
    enforcement: "warn",
  },
];

const travelLocalization: LocalizationResource[] = [
  {
    language: "en",
    strings: {
      "flight.booked": "Flight booked successfully",
      "visa.required": "A visa is required for your destination",
      "booking.cancelled": "Your booking has been cancelled",
    },
  },
  {
    language: "ar",
    country: "EG",
    strings: {
      "flight.booked": "تم حجز الرحلة بنجاح",
      "visa.required": "التأشيرة مطلوبة لوجهتك",
      "booking.cancelled": "تم إلغاء حجزك",
    },
    complianceRules: ["egyptian-civil-aviation-regulations"],
  },
  {
    language: "ar",
    country: "SA",
    strings: {
      "flight.booked": "تم حجز الرحلة بنجاح",
      "visa.required": "التأشيرة مطلوبة لوجهتك",
    },
    complianceRules: ["saudi-gaca-regulations"],
  },
];

const travelAdapters: IntegrationAdapter[] = [
  {
    capabilityId: "cirkle.travel.book-flight",
    type: "external-api",
    executor: simulatedExecutor("cirkle.travel.book-flight"),
    requiresCredentials: true,
    secretReferences: ["travel-api-key"],
  },
  {
    capabilityId: "cirkle.travel.cancel-booking",
    type: "external-api",
    executor: simulatedExecutor("cirkle.travel.cancel-booking"),
    requiresCredentials: true,
    secretReferences: ["travel-api-key"],
  },
  {
    capabilityId: "cirkle.travel.check-visa",
    type: "internal",
    executor: simulatedExecutor("cirkle.travel.check-visa"),
    requiresCredentials: false,
  },
  {
    capabilityId: "cirkle.travel.track-flight",
    type: "external-api",
    executor: simulatedExecutor("cirkle.travel.track-flight"),
    requiresCredentials: true,
    secretReferences: ["flight-tracker-api-key"],
  },
];

export const travelPack: CapabilityPack = {
  manifest: {
    packId: "cirkle.travel",
    name: "Cirkle Travel Pack",
    description: "Travel capabilities: flight booking, cancellation, visa checks, flight tracking",
    version: "1.0.0",
    category: "travel",
    author: "Cirkle",
    license: "Proprietary",
    supportedRegions: ["*"],
    dependencies: [],
    permissions: ["travel:book", "travel:cancel"],
    consentPurposes: [],
    lifecycleState: "draft",
    minPlatformVersion: "1.0.0",
    signed: true,
    signature: "sha256:sample-travel-pack-signature",
    entryPoints: ["cirkle.travel.book-flight", "cirkle.travel.check-visa"],
  },
  capabilities: travelCapabilities,
  workflowTemplates: travelWorkflows,
  policies: travelPolicies,
  localization: travelLocalization,
  adapters: travelAdapters,
};

// ── 2. Payments Capability Pack ──────────────────────────────────────────

const paymentsCapabilities: PackCapability[] = [
  {
    capabilityId: "cirkle.payments.recurring-payment",
    name: "Recurring Payment",
    description: "Set up a recurring payment schedule",
    category: "payments",
    inputSchema: {
      to: { type: "string", required: true },
      amount: { type: "number", required: true },
      currency: { type: "string", required: true },
      frequency: { type: "string", required: true, description: "daily, weekly, monthly" },
    },
    outputSchema: {
      scheduleId: { type: "string" },
      nextPaymentDate: { type: "string" },
    },
    permissions: ["pay:send", "pay:recurring"],
    dependencies: [],
    availability: "available",
    tags: ["payments", "recurring", "schedule"],
    requiresConfirmation: true,
  },
  {
    capabilityId: "cirkle.payments.payment-history",
    name: "Payment History",
    description: "Retrieve payment history for a user",
    category: "payments",
    inputSchema: {
      username: { type: "string", required: true },
      from: { type: "string" },
      to: { type: "string" },
    },
    outputSchema: {
      transactions: { type: "array" },
      total: { type: "number" },
    },
    permissions: [],
    dependencies: [],
    availability: "available",
    tags: ["payments", "history", "records"],
    requiresConfirmation: false,
  },
];

const paymentsPolicies: PolicyDefinition[] = [
  {
    policyId: "cirkle.payments.policy.daily-limit",
    type: "rate-limit",
    description: "Maximum 50 payments per day per user",
    capabilityId: "cirkle.payments.recurring-payment",
    rules: { maxInvocations: 50, windowSeconds: 86400 },
    applicableCountries: ["*"],
    enforcement: "block",
  },
  {
    policyId: "cirkle.payments.policy.egypt-cbe",
    type: "regulatory-prerequisite",
    description: "Egyptian Central Bank regulations for digital payments",
    capabilityId: "cirkle.payments.recurring-payment",
    rules: { prerequisiteMet: true },
    applicableCountries: ["EG"],
    enforcement: "block",
  },
];

const paymentsLocalization: LocalizationResource[] = [
  {
    language: "en",
    strings: {
      "payment.scheduled": "Recurring payment scheduled",
      "payment.history": "Payment history retrieved",
    },
  },
  {
    language: "ar",
    country: "EG",
    strings: {
      "payment.scheduled": "تم جدولة الدفع الدوري",
      "payment.history": "تم استرجاع سجل المدفوعات",
    },
    complianceRules: ["cbe-digital-payment-regulations"],
  },
];

const paymentsAdapters: IntegrationAdapter[] = [
  {
    capabilityId: "cirkle.payments.recurring-payment",
    type: "payment-provider",
    executor: simulatedExecutor("cirkle.payments.recurring-payment"),
    requiresCredentials: true,
    secretReferences: ["payment-provider-key"],
  },
  {
    capabilityId: "cirkle.payments.payment-history",
    type: "internal",
    executor: simulatedExecutor("cirkle.payments.payment-history"),
    requiresCredentials: false,
  },
];

export const paymentsPack: CapabilityPack = {
  manifest: {
    packId: "cirkle.payments",
    name: "Cirkle Payments Pack",
    description: "Advanced payments: recurring payments, payment history",
    version: "1.0.0",
    category: "payments",
    author: "Cirkle",
    license: "Proprietary",
    supportedRegions: ["*"],
    dependencies: [],
    permissions: ["pay:send", "pay:recurring"],
    consentPurposes: ["ai_personalization"],
    lifecycleState: "draft",
    minPlatformVersion: "1.0.0",
    signed: true,
    signature: "sha256:sample-payments-pack-signature",
    entryPoints: ["cirkle.payments.recurring-payment", "cirkle.payments.payment-history"],
  },
  capabilities: paymentsCapabilities,
  workflowTemplates: [],
  policies: paymentsPolicies,
  localization: paymentsLocalization,
  adapters: paymentsAdapters,
};

// ── 3. Government Services Pack ──────────────────────────────────────────

const governmentCapabilities: PackCapability[] = [
  {
    capabilityId: "cirkle.gov.document-verification",
    name: "Document Verification",
    description: "Verify a government-issued document",
    category: "government",
    inputSchema: {
      documentType: { type: "string", required: true, description: "passport, national_id, driver_license" },
      documentNumber: { type: "string", required: true },
      country: { type: "string", required: true },
    },
    outputSchema: {
      verified: { type: "boolean" },
      holderName: { type: "string" },
      expiryDate: { type: "string" },
    },
    permissions: ["gov:verify"],
    dependencies: [],
    availability: "available",
    tags: ["government", "verification", "identity"],
    availableInCountries: ["EG", "SA", "AE"],
    requiresConfirmation: true,
  },
  {
    capabilityId: "cirkle.gov.tax-filing",
    name: "Tax Filing",
    description: "File taxes with the government",
    category: "government",
    inputSchema: {
      taxYear: { type: "string", required: true },
      income: { type: "number", required: true },
      deductions: { type: "array" },
    },
    outputSchema: {
      filingId: { type: "string" },
      taxOwed: { type: "number" },
      status: { type: "string" },
    },
    permissions: ["gov:file-tax"],
    dependencies: ["cirkle.gov.document-verification"],
    availability: "available",
    tags: ["government", "tax", "filing"],
    availableInCountries: ["EG", "SA"],
    requiresConfirmation: true,
  },
];

const governmentPolicies: PolicyDefinition[] = [
  {
    policyId: "cirkle.gov.policy.egypt-nida",
    type: "regulatory-prerequisite",
    description: "Egyptian NIDA system integration required",
    capabilityId: "cirkle.gov.document-verification",
    rules: { prerequisiteMet: true },
    applicableCountries: ["EG"],
    enforcement: "block",
  },
  {
    policyId: "cirkle.gov.policy.tax-deadline",
    type: "time-window",
    description: "Tax filing only available Jan-Apr",
    capabilityId: "cirkle.gov.tax-filing",
    rules: { allowedMonths: [0, 1, 2, 3] },
    applicableCountries: ["EG", "SA"],
    enforcement: "block",
  },
];

const governmentLocalization: LocalizationResource[] = [
  {
    language: "ar",
    country: "EG",
    strings: {
      "doc.verified": "تم التحقق من المستند",
      "tax.filed": "تم تقديم الإقرار الضريبي",
    },
    complianceRules: ["egypt-nida-regulations", "egyptian-tax-authority-rules"],
    workflowOverrides: ["cirkle.gov.egypt-tax-workflow"],
  },
  {
    language: "ar",
    country: "SA",
    strings: {
      "doc.verified": "تم التحقق من المستند",
      "tax.filed": "تم تقديم الإقرار الضريبي",
    },
    complianceRules: ["saudi-abama-regulations", "saudi-zatca-rules"],
  },
];

const governmentAdapters: IntegrationAdapter[] = [
  {
    capabilityId: "cirkle.gov.document-verification",
    type: "government",
    executor: simulatedExecutor("cirkle.gov.document-verification"),
    requiresCredentials: true,
    secretReferences: ["gov-api-key", "gov-certificate"],
  },
  {
    capabilityId: "cirkle.gov.tax-filing",
    type: "government",
    executor: simulatedExecutor("cirkle.gov.tax-filing"),
    requiresCredentials: true,
    secretReferences: ["gov-tax-api-key"],
  },
];

export const governmentPack: CapabilityPack = {
  manifest: {
    packId: "cirkle.gov",
    name: "Cirkle Government Services Pack",
    description: "Government services: document verification, tax filing",
    version: "1.0.0",
    category: "government",
    author: "Cirkle",
    license: "Proprietary",
    supportedRegions: ["EG", "SA", "AE"],
    dependencies: [],
    permissions: ["gov:verify", "gov:file-tax"],
    consentPurposes: [],
    lifecycleState: "draft",
    minPlatformVersion: "1.0.0",
    signed: true,
    signature: "sha256:sample-government-pack-signature",
    entryPoints: ["cirkle.gov.document-verification", "cirkle.gov.tax-filing"],
  },
  capabilities: governmentCapabilities,
  workflowTemplates: [],
  policies: governmentPolicies,
  localization: governmentLocalization,
  adapters: governmentAdapters,
};

// ── All sample packs ─────────────────────────────────────────────────────

export const samplePacks: CapabilityPack[] = [travelPack, paymentsPack, governmentPack];
