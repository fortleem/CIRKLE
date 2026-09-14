/**
 * Admin Panel Section Registry
 * ============================================================================
 * Single source of truth for the 13 sections of the CIRKLE Platform Admin
 * Panel. Each section has an id, label (EN + AR), icon, description, and the
 * data source(s) it pulls from.
 *
 * Sections:
 *   1.  overview     — top-level KPIs + system health
 *   2.  users        — User table management
 *   3.  content      — Post moderation + flagged content
 *   4.  circles      — CircleGroup + members + join requests
 *   5.  ai           — Brain AI providers + knowledge graph
 *   6.  aike         — Phase 7.5 Autonomous Intelligence status
 *   7.  news         — News Orchestrator 5-source pipeline
 *   8.  payments     — Transaction monitoring + fraud
 *   9.  overlays     — 71 overlays + feature flags
 *  10.  api          — 237 API routes + rate limits
 *  11.  errors       — Error monitoring history + stats
 *  12.  features     — 46 admin-controlled platform feature on/off toggles
 *  13.  system       — Turso DB + env + git + backups
 *
 * NOTE: The admin panel is in BUILDING PHASE — no auth gate. A visible
 * "DEV MODE — NO AUTH" banner is shown. Will be replaced with a hidden
 * extension + OIDC admin role in a future iteration.
 */

import {
  LayoutDashboard,
  Users,
  FileText,
  CircleDot,
  Brain,
  Sparkles,
  Newspaper,
  Wallet,
  Grid3x3,
  Network,
  AlertTriangle,
  ServerCog,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";

export type AdminSectionId =
  | "overview"
  | "users"
  | "content"
  | "circles"
  | "ai"
  | "aike"
  | "news"
  | "payments"
  | "overlays"
  | "api"
  | "errors"
  | "features"
  | "system";

export interface AdminSection {
  id: AdminSectionId;
  label: string;
  labelAr: string;
  icon: LucideIcon;
  description: string;
  descriptionAr: string;
  /** Primary data source — the API route the section fetches on mount. */
  endpoint: string;
  /** Category for grouping in the sidebar. */
  group: "operations" | "intelligence" | "infrastructure";
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "overview",
    label: "Overview",
    labelAr: "نظرة عامة",
    icon: LayoutDashboard,
    description: "Top-level KPIs, system health, and platform version",
    descriptionAr: "المؤشرات الرئيسية وصحة النظام وإصدار المنصة",
    endpoint: "/api/admin/overview",
    group: "operations",
  },
  {
    id: "users",
    label: "Users & Accounts",
    labelAr: "المستخدمون والحسابات",
    icon: Users,
    description: "User table, verification, regions, signups",
    descriptionAr: "جدول المستخدمين، التحقق، المناطق، التسجيلات",
    endpoint: "/api/admin/users",
    group: "operations",
  },
  {
    id: "content",
    label: "Content Moderation",
    labelAr: "مراقبة المحتوى",
    icon: FileText,
    description: "Posts, visibility, anonymous activity, engagement",
    descriptionAr: "المنشورات، الظهور، النشاط المجهول، التفاعل",
    endpoint: "/api/admin/content",
    group: "operations",
  },
  {
    id: "circles",
    label: "Circles & Groups",
    labelAr: "الدوائر والمجموعات",
    icon: CircleDot,
    description: "Circle groups, members, categories, modes",
    descriptionAr: "مجموعات الدائرة، الأعضاء، الفئات، الأوضاع",
    endpoint: "/api/admin/circles",
    group: "operations",
  },
  {
    id: "ai",
    label: "Brain AI",
    labelAr: "ذكاء الدائرة",
    icon: Brain,
    description: "5 AI providers, knowledge graph, features, actions",
    descriptionAr: "5 مزودي ذكاء، شبكة المعرفة، الميزات، الإجراءات",
    endpoint: "/api/brain/status",
    group: "intelligence",
  },
  {
    id: "aike",
    label: "AIKE (Phase 7.5)",
    labelAr: "AIKE (المرحلة 7.5)",
    icon: Sparkles,
    description: "Autonomous Intelligence & Knowledge Engine status",
    descriptionAr: "حالة محرك الذكاء المستقل والمعرفة",
    endpoint: "/api/aike/status",
    group: "intelligence",
  },
  {
    id: "news",
    label: "News Orchestrator",
    labelAr: "منسق الأخبار",
    icon: Newspaper,
    description: "5-source news pipeline, 246 countries, cache",
    descriptionAr: "خط أنابيب الأخبار ذو المصادر الخمسة، 246 دولة، ذاكرة التخزين",
    endpoint: "/api/news/orchestrator-status",
    group: "intelligence",
  },
  {
    id: "payments",
    label: "Payments",
    labelAr: "المدفوعات",
    icon: Wallet,
    description: "Transactions, volume, methods, fraud alerts",
    descriptionAr: "المعاملات، الحجم، الطرق، تنبيهات الاحتيال",
    endpoint: "/api/admin/payments",
    group: "operations",
  },
  {
    id: "overlays",
    label: "Overlays & Features",
    labelAr: "الطبقات والميزات",
    icon: Grid3x3,
    description: "71 overlays, feature flags, DRE toggles",
    descriptionAr: "71 طبقة، أعلام الميزات، مفاتيح DRE",
    endpoint: "/api/admin/overlays",
    group: "infrastructure",
  },
  {
    id: "api",
    label: "API & Routes",
    labelAr: "واجهة البرمجة والمسارات",
    icon: Network,
    description: "237 routes, rate limits, validation, smoke tests",
    descriptionAr: "237 مسار، حدود المعدل، التحقق، اختبارات الدخان",
    endpoint: "/api/admin/api-routes",
    group: "infrastructure",
  },
  {
    id: "errors",
    label: "Errors & Monitoring",
    labelAr: "الأخطاء والمراقبة",
    icon: AlertTriangle,
    description: "Error history, stats, captured messages",
    descriptionAr: "سجل الأخطاء، الإحصائيات، الرسائل المسجلة",
    endpoint: "/api/monitoring/errors",
    group: "infrastructure",
  },
  {
    id: "features",
    label: "Feature Toggles",
    labelAr: "مفاتيح الميزات",
    icon: ToggleRight,
    description: "Admin-controlled platform feature on/off switches",
    descriptionAr: "مفاتيح تشغيل/إيقاف الميزات التي يتحكم بها المدير",
    endpoint: "/api/admin/features",
    group: "infrastructure",
  },
  {
    id: "system",
    label: "System & Database",
    labelAr: "النظام وقاعدة البيانات",
    icon: ServerCog,
    description: "Turso DB, env validation, git, backups",
    descriptionAr: "قاعدة بيانات Turso، التحقق من البيئة، git، النسخ الاحتياطية",
    endpoint: "/api/admin/system",
    group: "infrastructure",
  },
];

export const ADMIN_SECTION_GROUPS: { id: "operations" | "intelligence" | "infrastructure"; label: string; labelAr: string }[] = [
  { id: "operations", label: "Operations", labelAr: "العمليات" },
  { id: "intelligence", label: "Intelligence", labelAr: "الذكاء" },
  { id: "infrastructure", label: "Infrastructure", labelAr: "البنية التحتية" },
];

export const ADMIN_SECTION_COUNT = ADMIN_SECTIONS.length;
