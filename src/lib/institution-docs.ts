/**
 * Institution Document Requirements
 * ============================================================================
 * Defines which documents are required to register an institution, based on
 * the country + company type. Each country has different legal requirements.
 *
 * The data is static (seeded into the InstitutionDocRequirement table on
 * first request). The admin can view/override via the admin panel.
 */

export interface DocRequirement {
  /** Stable key for this document type. */
  key: string;
  /** English label. */
  labelEn: string;
  /** Arabic label. */
  labelAr: string;
  /** What this document is (e.g. "Commercial Registration"). */
  description: string;
  /** Accepted file formats. */
  acceptedFormats: string[];
  /** Maximum file size in MB. */
  maxSizeMb: number;
}

export interface CompanyTypeDef {
  key: string;
  labelEn: string;
  labelAr: string;
}

export const COMPANY_TYPES: CompanyTypeDef[] = [
  { key: "llc", labelEn: "LLC — Limited Liability Company", labelAr: "شركة ذات مسؤولية محدودة" },
  { key: "sole_proprietorship", labelEn: "Sole Proprietorship", labelAr: "منشأة فردية" },
  { key: "corporation", labelEn: "Corporation (JSC)", labelAr: "شركة مساهمة" },
  { key: "partnership", labelEn: "Partnership", labelAr: "شركة تضامن" },
  { key: "nonprofit", labelEn: "Non-Profit / NGO", labelAr: "منظمة غير ربحية" },
  { key: "government", labelEn: "Government Entity", labelAr: "جهة حكومية" },
  { key: "startup", labelEn: "Startup / Tech Company", labelAr: "شركة ناشئة" },
  { key: "freelance", labelEn: "Freelance / Self-Employed", labelAr: "عمل حر" },
];

// ── Common documents used across countries ─────────────────────────────────
const COMMON_DOCS = {
  commercial_registration: (labelEn: string, labelAr: string): DocRequirement => ({
    key: "commercial_registration",
    labelEn,
    labelAr,
    description: "Official commercial/company registration certificate issued by the government.",
    acceptedFormats: ["pdf", "jpg", "png"],
    maxSizeMb: 10,
  }),
  tax_id: (labelEn: string, labelAr: string): DocRequirement => ({
    key: "tax_id",
    labelEn,
    labelAr,
    description: "Tax identification number certificate (VAT, EIN, or equivalent).",
    acceptedFormats: ["pdf", "jpg", "png"],
    maxSizeMb: 5,
  }),
  id_founder: (): DocRequirement => ({
    key: "founder_id",
    labelEn: "Founder's National ID / Passport",
    labelAr: "بطاقة الهوية الوطنية / جواز سفر المؤسس",
    description: "Government-issued photo ID of the founder (personal account holder).",
    acceptedFormats: ["pdf", "jpg", "png"],
    maxSizeMb: 5,
  }),
  bank_letter: (): DocRequirement => ({
    key: "bank_letter",
    labelEn: "Bank Account Verification Letter",
    labelAr: "خطاب التحقق من الحساب البنكي",
    description: "A letter from the institution's bank confirming the account exists.",
    acceptedFormats: ["pdf", "jpg", "png"],
    maxSizeMb: 5,
  }),
  articles_of_association: (labelEn: string, labelAr: string): DocRequirement => ({
    key: "articles_of_association",
    labelEn,
    labelAr,
    description: "Legal document defining the company's structure, ownership, and rules.",
    acceptedFormats: ["pdf"],
    maxSizeMb: 15,
  }),
  business_license: (labelEn: string, labelAr: string): DocRequirement => ({
    key: "business_license",
    labelEn,
    labelAr,
    description: "Active business/trade license from the relevant authority.",
    acceptedFormats: ["pdf", "jpg", "png"],
    maxSizeMb: 10,
  }),
  power_of_attorney: (): DocRequirement => ({
    key: "power_of_attorney",
    labelEn: "Power of Attorney (if representative)",
    labelAr: "توكيل رسمي (في حال كان الممثل)",
    description: "Notarized power of attorney if the registrant is acting on behalf of the owner.",
    acceptedFormats: ["pdf"],
    maxSizeMb: 10,
  }),
};

// ── Country + company type → required documents ────────────────────────────
type DocMatrix = Record<string, Record<string, DocRequirement[]>>;

const DOC_MATRIX: DocMatrix = {
  // ── Egypt (EG) ─────────────────────────────────────────────────────────
  EG: {
    llc: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("Tax Card (البطاقة الضريبية)", "البطاقة الضريبية"),
      COMMON_DOCS.articles_of_association("Articles of Association (عقد التأسيس)", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    sole_proprietorship: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("Tax Card (البطاقة الضريبية)", "البطاقة الضريبية"),
      COMMON_DOCS.id_founder(),
    ],
    corporation: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("Tax Card (البطاقة الضريبية)", "البطابة الضريبية"),
      COMMON_DOCS.articles_of_association("Articles of Association (عقد التأسيس)", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    partnership: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("Tax Card (البطاقة الضريبية)", "البطاقة الضريبية"),
      COMMON_DOCS.articles_of_association("Partnership Agreement (عقد تضامن)", "عقد تضامن"),
      COMMON_DOCS.id_founder(),
    ],
    nonprofit: [
      COMMON_DOCS.commercial_registration("NGO Registration (سجل الجمعيات)", "سجل الجمعيات"),
      COMMON_DOCS.articles_of_association("Statutes (النظام الأساسي)", "النظام الأساسي"),
      COMMON_DOCS.id_founder(),
    ],
    government: [
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.power_of_attorney(),
    ],
    startup: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("Tax Card (البطاقة الضريبية)", "البطاقة الضريبية"),
      COMMON_DOCS.id_founder(),
    ],
    freelance: [
      COMMON_DOCS.tax_id("Tax Card (البطاقة الضريبية)", "البطاقة الضريبية"),
      COMMON_DOCS.id_founder(),
    ],
  },

  // ── Saudi Arabia (SA) ──────────────────────────────────────────────────
  SA: {
    llc: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("VAT Certificate (شهادة ضريبة القيمة المضافة)", "شهادة ضريبة القيمة المضافة"),
      COMMON_DOCS.articles_of_association("Articles of Association (عقد التأسيس)", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    sole_proprietorship: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("VAT Certificate (شهادة ضريبة القيمة المضافة)", "شهادة ضريبة القيمة المضافة"),
      COMMON_DOCS.id_founder(),
    ],
    corporation: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("VAT Certificate (شهادة ضريبة القيمة المضافة)", "شهادة ضريبة القيمة المضافة"),
      COMMON_DOCS.articles_of_association("Articles of Association (عقد التأسيس)", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    partnership: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("VAT Certificate (شهادة ضريبة القيمة المضافة)", "شهادة ضريبة القيمة المضافة"),
      COMMON_DOCS.articles_of_association("Partnership Agreement (عقد تضامن)", "عقد تضامن"),
      COMMON_DOCS.id_founder(),
    ],
    nonprofit: [
      COMMON_DOCS.commercial_registration("NGO License (ترخيص جمعية)", "ترخيص جمعية"),
      COMMON_DOCS.articles_of_association("Statutes (النظام الأساسي)", "النظام الأساسي"),
      COMMON_DOCS.id_founder(),
    ],
    government: [COMMON_DOCS.id_founder(), COMMON_DOCS.power_of_attorney()],
    startup: [
      COMMON_DOCS.commercial_registration("Commercial Registration (سجل تجاري)", "سجل تجاري"),
      COMMON_DOCS.tax_id("VAT Certificate (شهادة ضريبة القيمة المضافة)", "شهادة ضريبة القيمة المضافة"),
      COMMON_DOCS.id_founder(),
    ],
    freelance: [
      COMMON_DOCS.tax_id("VAT Certificate (شهادة ضريبة القيمة المضافة)", "شهادة ضريبة القيمة المضافة"),
      COMMON_DOCS.id_founder(),
    ],
  },

  // ── United Arab Emirates (AE) ──────────────────────────────────────────
  AE: {
    llc: [
      COMMON_DOCS.commercial_registration("Trade License (رخصة تجارية)", "رخصة تجارية"),
      COMMON_DOCS.tax_id("TRN Certificate (شهادة التسجيل الضريبي)", "شهادة التسجيل الضريبي"),
      COMMON_DOCS.articles_of_association("Memorandum of Association (عقد التأسيس)", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    sole_proprietorship: [
      COMMON_DOCS.commercial_registration("Trade License (رخصة تجارية)", "رخصة تجارية"),
      COMMON_DOCS.id_founder(),
    ],
    corporation: [
      COMMON_DOCS.commercial_registration("Trade License (رخصة تجارية)", "رخصة تجارية"),
      COMMON_DOCS.tax_id("TRN Certificate (شهادة التسجيل الضريبي)", "شهادة التسجيل الضريبي"),
      COMMON_DOCS.articles_of_association("Memorandum of Association (عقد التأسيس)", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    partnership: [
      COMMON_DOCS.commercial_registration("Trade License (رخصة تجارية)", "رخصة تجارية"),
      COMMON_DOCS.articles_of_association("Partnership Agreement (عقد تضامن)", "عقد تضامن"),
      COMMON_DOCS.id_founder(),
    ],
    nonprofit: [
      COMMON_DOCS.commercial_registration("Authority License (ترخيص الجهة)", "ترخيص الجهة"),
      COMMON_DOCS.articles_of_association("Statutes (النظام الأساسي)", "النظام الأساسي"),
      COMMON_DOCS.id_founder(),
    ],
    government: [COMMON_DOCS.id_founder(), COMMON_DOCS.power_of_attorney()],
    startup: [
      COMMON_DOCS.commercial_registration("Trade License (رخصة تجارية)", "رخصة تجارية"),
      COMMON_DOCS.id_founder(),
    ],
    freelance: [
      COMMON_DOCS.commercial_registration("Freelance Permit (تصريح عمل حر)", "تصريح عمل حر"),
      COMMON_DOCS.id_founder(),
    ],
  },

  // ── United States (US) ─────────────────────────────────────────────────
  US: {
    llc: [
      COMMON_DOCS.articles_of_association("Articles of Organization", "عقد التأسيس"),
      COMMON_DOCS.tax_id("EIN Letter (IRS)", "رسالة EIN من IRS"),
      COMMON_DOCS.business_license("Business License", "رخصة تجارية"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    sole_proprietorship: [
      COMMON_DOCS.tax_id("EIN or SSN (IRS)", "EIN أو SSN"),
      COMMON_DOCS.business_license("Business License", "رخصة تجارية"),
      COMMON_DOCS.id_founder(),
    ],
    corporation: [
      COMMON_DOCS.articles_of_association("Articles of Incorporation", "عقد التأسيس"),
      COMMON_DOCS.tax_id("EIN Letter (IRS)", "رسالة EIN من IRS"),
      COMMON_DOCS.business_license("Business License", "رخصة تجارية"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    partnership: [
      COMMON_DOCS.articles_of_association("Partnership Agreement", "عقد تضامن"),
      COMMON_DOCS.tax_id("EIN Letter (IRS)", "رسالة EIN من IRS"),
      COMMON_DOCS.id_founder(),
    ],
    nonprofit: [
      COMMON_DOCS.articles_of_association("501(c) Determination Letter", "خطاب تحديد 501(c)"),
      COMMON_DOCS.tax_id("EIN Letter (IRS)", "رسالة EIN من IRS"),
      COMMON_DOCS.id_founder(),
    ],
    government: [COMMON_DOCS.id_founder(), COMMON_DOCS.power_of_attorney()],
    startup: [
      COMMON_DOCS.articles_of_association("Articles of Organization", "عقد التأسيس"),
      COMMON_DOCS.tax_id("EIN Letter (IRS)", "رسالة EIN من IRS"),
      COMMON_DOCS.id_founder(),
    ],
    freelance: [
      COMMON_DOCS.tax_id("SSN or EIN (IRS)", "SSN أو EIN"),
      COMMON_DOCS.id_founder(),
    ],
  },

  // ── United Kingdom (GB) ───────────────────────────────────────────────
  GB: {
    llc: [
      COMMON_DOCS.commercial_registration("Certificate of Incorporation (Companies House)", "شهادة التأسيس"),
      COMMON_DOCS.tax_id("UTR / VAT Certificate (HMRC)", "شهادة UTR / VAT"),
      COMMON_DOCS.articles_of_association("Memorandum & Articles of Association", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    sole_proprietorship: [
      COMMON_DOCS.tax_id("UTR (HMRC)", "UTR"),
      COMMON_DOCS.id_founder(),
    ],
    corporation: [
      COMMON_DOCS.commercial_registration("Certificate of Incorporation (Companies House)", "شهادة التأسيس"),
      COMMON_DOCS.tax_id("UTR / VAT Certificate (HMRC)", "شهادة UTR / VAT"),
      COMMON_DOCS.articles_of_association("Memorandum & Articles of Association", "عقد التأسيس"),
      COMMON_DOCS.id_founder(),
      COMMON_DOCS.bank_letter(),
    ],
    partnership: [
      COMMON_DOCS.commercial_registration("Certificate of Incorporation (Companies House)", "شهادة التأسيس"),
      COMMON_DOCS.tax_id("UTR (HMRC)", "UTR"),
      COMMON_DOCS.articles_of_association("Partnership Agreement", "عقد تضامن"),
      COMMON_DOCS.id_founder(),
    ],
    nonprofit: [
      COMMON_DOCS.commercial_registration("Charity Commission Registration", "تسجيل لجنة الإحسان"),
      COMMON_DOCS.articles_of_association("Governing Document", "وثيقة الحوكمة"),
      COMMON_DOCS.id_founder(),
    ],
    government: [COMMON_DOCS.id_founder(), COMMON_DOCS.power_of_attorney()],
    startup: [
      COMMON_DOCS.commercial_registration("Certificate of Incorporation (Companies House)", "شهادة التأسيس"),
      COMMON_DOCS.id_founder(),
    ],
    freelance: [
      COMMON_DOCS.tax_id("UTR (HMRC)", "UTR"),
      COMMON_DOCS.id_founder(),
    ],
  },
};

// ── Fallback for unsupported countries ─────────────────────────────────────
const DEFAULT_DOCS: DocRequirement[] = [
  COMMON_DOCS.commercial_registration("Commercial Registration", "سجل تجاري"),
  COMMON_DOCS.tax_id("Tax ID Certificate", "شهادة الرقم الضريبي"),
  COMMON_DOCS.id_founder(),
];

/**
 * Get the required documents for a given country + company type.
 * Falls back to DEFAULT_DOCS for unsupported country/company combinations.
 */
export function getRequiredDocs(country: string, companyType: string): DocRequirement[] {
  const cc = country.trim().toUpperCase();
  const ct = companyType.trim().toLowerCase();
  const countryMatrix = DOC_MATRIX[cc];
  if (countryMatrix && countryMatrix[ct]) {
    return countryMatrix[ct];
  }
  // If country exists but company type doesn't, use the country's LLC docs as fallback.
  if (countryMatrix && countryMatrix.llc) {
    return countryMatrix.llc;
  }
  return DEFAULT_DOCS;
}

/**
 * Get a list of supported countries (those with a defined doc matrix).
 */
export function getSupportedCountries(): string[] {
  return Object.keys(DOC_MATRIX).sort();
}

/**
 * Check whether a country has a specific doc matrix defined.
 */
export function isCountrySupported(country: string): boolean {
  return DOC_MATRIX.hasOwnProperty(country.trim().toUpperCase());
}
