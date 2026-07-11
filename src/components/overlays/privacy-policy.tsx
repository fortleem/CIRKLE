"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ShieldCheck, Languages, FileText, Database, Scale, Mail,
  Clock, AlertTriangle, Baby, Globe, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Lang = "en" | "ar";

interface Section {
  id: string;
  icon: typeof FileText;
  title: { en: string; ar: string };
  body: { en: React.ReactNode; ar: React.ReactNode };
}

const POLICY_VERSION = "1.0.0";
const LAST_UPDATED = "2025-01-15";

const SECTIONS: Section[] = [
  {
    id: "intro",
    icon: ShieldCheck,
    title: { en: "1. Introduction", ar: "١. مقدمة" },
    body: {
      en: (
        <>
          <p>
            Cirkle (دواير) — &quot;we&quot;, &quot;us&quot;, &quot;our&quot; — operates a privacy-first
            social super-app. This Privacy Policy explains what personal data we
            collect, why we process it, the lawful basis for each purpose, and
            the rights you have over your data.
          </p>
          <p>
            We comply with the EU General Data Protection Regulation (GDPR),
            the Saudi Personal Data Protection Law (PDPL), the Egyptian
            Personal Data Protection Law (Law 151 of 2020), and the U.S.
            Children&apos;s Online Privacy Protection Act (COPPA) where applicable.
          </p>
          <p className="text-muted-foreground">
            Policy version: <span className="font-mono">{POLICY_VERSION}</span> · Last updated: {LAST_UPDATED}
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            تُشغّل دواير (Cirkle) — &quot;نحن&quot; — تطبيقًا اجتماعيًا فائقًا يضع
            الخصوصية أولًا. تشرح سياسة الخصوصية هذه البيانات الشخصية التي نجمعها،
            وسبب معالجتها، والأساس القانوني لكل غرض، والحقوق التي تملكها على بياناتك.
          </p>
          <p>
            نلتزم باللائحة العامة لحماية البيانات الأوروبية (GDPR)، ونظام حماية
            البيانات الشخصية السعودي (PDPL)، وقانون حماية البيانات المصري
            (قانون ١٥١ لسنة ٢٠٢٠)، وقانون حماية خصوصية الأطفال الأمريكي (COPPA)
            عند انطباقه.
          </p>
          <p className="text-muted-foreground">
            إصدار السياسة: <span className="font-mono">{POLICY_VERSION}</span> · آخر تحديث: {LAST_UPDATED}
          </p>
        </>
      ),
    },
  },
  {
    id: "inventory",
    icon: Database,
    title: { en: "2. Data We Collect", ar: "٢. البيانات التي نجمعها" },
    body: {
      en: (
        <>
          <h4>Account data</h4>
          <ul>
            <li>Username, display name, optional recovery email, country, date of birth (for age gate).</li>
            <li>Hashed password — stored only on your device via bcrypt. We never see it.</li>
          </ul>
          <h4>Content you create</h4>
          <ul>
            <li>Wasl messages (end-to-end encrypted), Midan posts, Lamahat photos, Mashahd videos.</li>
            <li>Citizen Shield reports — stored zero-knowledge with tamper-evident chain of custody.</li>
            <li>Circle Verify claims — zero-knowledge attestations (over-18, nationality, professional).</li>
          </ul>
          <h4>Usage & telemetry</h4>
          <ul>
            <li>Aggregate, anonymized interaction events (only with Analytics consent).</li>
            <li>On-device Brain memory (IndexedDB) — never leaves your device unless you opt in to Federated Learning.</li>
          </ul>
          <h4>Payment metadata</h4>
          <ul>
            <li>Cirkle Pay transaction records (amount, counterparty handle, method, timestamp).</li>
            <li>We do NOT store card numbers or full account credentials. Settlement is non-custodial.</li>
          </ul>
          <h4>Device & connection</h4>
          <ul>
            <li>IP address (transient, for rate-limiting only), browser type, app version.</li>
            <li>Approximate location (country/city level) — opt-in for mesh presence.</li>
          </ul>
        </>
      ),
      ar: (
        <>
          <h4>بيانات الحساب</h4>
          <ul>
            <li>اسم المستخدم، الاسم المعروض، بريد الاستعادة الاختياري، الدولة، تاريخ الميلاد (للبوابة العمرية).</li>
            <li>كلمة المرور مجزّأة بـ bcrypt — تُخزَّن على جهازك فقط. لا نراها أبدًا.</li>
          </ul>
          <h4>المحتوى الذي تنشئه</h4>
          <ul>
            <li>رسائل وصل (مشفّرة طرف-طرف)، منشورات الميدان، صور لمحات، فيديوهات مشهد.</li>
            <li>بلاغات درع المواطن — تُخزَّن بمعرفة صفريّة مع سلسلة عهدة مقاومة للتلاعب.</li>
            <li>ادعاءات تحقّق دواير — إثباتات بمعرفة صفريّة (فوق ١٨، الجنسية، المهنية).</li>
          </ul>
          <h4>الاستخدام والقياس</h4>
          <ul>
            <li>أحداث تفاعل مجمّعة ومجهولة الهوية (فقط عند الموافقة على التحليلات).</li>
            <li>ذاكرة الدماغ على الجهاز (IndexedDB) — لا تغادر جهازك إلا إذا اشتركت في التعلّم الموحّد.</li>
          </ul>
          <h4>بيانات الدفع</h4>
          <ul>
            <li>سجلات معاملات دفع دواير (المبلغ، معرّف الطرف الآخر، الوسيلة، الوقت).</li>
            <li>لا نخزّن أرقام البطاقات أو بيانات الحساب الكاملة. التسوية غير أمينية.</li>
          </ul>
          <h4>الجهاز والاتصال</h4>
          <ul>
            <li>عنوان IP (مؤقت، لتحديد المعدل فقط)، نوع المتصفح، إصدار التطبيق.</li>
            <li>الموقع التقريبي (مستوى الدولة/المدينة) — اختياري للحضور الشبكي.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "lawful",
    icon: Scale,
    title: { en: "3. Lawful Basis for Processing", ar: "٣. الأساس القانوني للمعالجة" },
    body: {
      en: (
        <>
          <p>We process personal data only when one of the following lawful bases applies (GDPR Article 6):</p>
          <ul>
            <li><b>Consent</b> — analytics, AI personalization, federated learning, marketing, push notifications, anonymous shield reports. You can withdraw consent at any time.</li>
            <li><b>Contract</b> — operating your account, delivering messages, processing payments you initiate.</li>
            <li><b>Legal obligation</b> — retaining transaction records and shield report metadata as required by financial and judicial authorities.</li>
            <li><b>Vital interests</b> — Citizen Shield panic / dead-man-switch features that may alert emergency contacts.</li>
            <li><b>Legitimate interests</b> — security, fraud prevention, rate-limiting, and aggregate product improvement (balanced against your rights).</li>
          </ul>
        </>
      ),
      ar: (
        <>
          <p>نعالج البيانات الشخصية فقط عند انطباق أحد الأسس القانونية التالية (المادة ٦ من GDPR):</p>
          <ul>
            <li><b>الموافقة</b> — التحليلات، تخصيص الذكاء الاصطناعي، التعلّم الموحّد، التسويق، الإشعارات، بلاغات الدرع المجهولة. يمكنك سحب الموافقة في أي وقت.</li>
            <li><b>العقد</b> — تشغيل حسابك، إيصال الرسائل، معالجة المدفوعات التي تبدأها.</li>
            <li><b>الالتزام قانوني</b> — الاحتفاظ بسجلات المعاملات وبيانات بلاغات الدرع كما تتطلب الجهات المالية والقضائية.</li>
            <li><b>المصالح الحيوية</b> — ميزات الدرع (زر الطوارئ والمفتاح الرقمي) التي قد تنبّه جهات اتصال الطوارئ.</li>
            <li><b>المصالح المشروعة</b> — الأمان، منع الاحتيال، تحديد المعدل، وتحسين المنتج بشكل مجمّع (موازنةً مع حقوقك).</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "rights",
    icon: FileText,
    title: { en: "4. Your Rights", ar: "٤. حقوقك" },
    body: {
      en: (
        <>
          <p>Depending on your jurisdiction, you may have the following rights over your personal data:</p>
          <ul>
            <li><b>Access</b> — request a copy of all data we hold about you (use Profile → Data Ownership → Export).</li>
            <li><b>Rectification</b> — correct inaccurate data via Profile → Edit.</li>
            <li><b>Erasure</b> — permanently delete your account and all associated data (Profile → Delete my account).</li>
            <li><b>Portability</b> — receive your data in a machine-readable JSON format.</li>
            <li><b>Objection</b> — object to processing based on legitimate interests or for direct marketing.</li>
            <li><b>Restriction</b> — request we limit processing while a dispute is resolved.</li>
            <li><b>Withdraw consent</b> — at any time, via Settings → Privacy → Consent Management.</li>
          </ul>
          <p>
            To exercise any of these rights, submit a Data Subject Request from Profile → Submit a data request,
            or contact our DPO at <span className="font-mono text-secondary">dpo@cirkle.app</span>. We respond within
            30 days (GDPR Article 12).
          </p>
        </>
      ),
      ar: (
        <>
          <p>اعتمادًا على ولايتك القضائية، قد تكون لك الحقوق التالية على بياناتك الشخصية:</p>
          <ul>
            <li><b>الوصول</b> — طلب نسخة من كل البيانات التي نحتفظ بها عنك (الملف → ملكية البيانات → تصدير).</li>
            <li><b>التصحيح</b> — تعديل البيانات غير الدقيقة عبر الملف → تحرير.</li>
            <li><b>الحذف</b> — حذف حسابك وكل البيانات المرتبطة به نهائيًا (الملف → حذف حسابي).</li>
            <li><b>قابلية النقل</b> — استلام بياناتك بتنسيق JSON قابل للقراءة آليًا.</li>
            <li><b>الاعتراض</b> — الاعتراض على المعالجة المبنية على المصالح المشروعة أو للتسويق المباشر.</li>
            <li><b>التقييد</b> — طلب تقييد المعالجة أثناء حل النزاع.</li>
            <li><b>سحب الموافقة</b> — في أي وقت، عبر الإعدادات → الخصوصية → إدارة الموافقات.</li>
          </ul>
          <p>
            لممارسة أي من هذه الحقوق، أرسل طلب بيانات من الملف → تقديم طلب بيانات،
            أو تواصل مع مسؤول حماية البيانات على <span className="font-mono text-secondary">dpo@cirkle.app</span>.
            نرد خلال ٣٠ يومًا (المادة ١٢ من GDPR).
          </p>
        </>
      ),
    },
  },
  {
    id: "vendors",
    icon: Globe,
    title: { en: "5. Third-Party Vendors", ar: "٥. مزوّدون خارجيون" },
    body: {
      en: (
        <>
          <p>We use a small set of trusted subprocessors. Each is bound by a Data Processing Agreement and may only process data for the stated purpose:</p>
          <ul>
            <li><b>LLM providers</b> (Groq, OpenAI, Google Gemini) — generate feed content, news recommendations, AI replies. Only your prompt text is sent; no account data.</li>
            <li><b>Open-Meteo</b> — weather forecasts (city name only).</li>
            <li><b>OpenStreetMap / Nominatim</b> — geocoding and map tiles.</li>
            <li><b>Prisma + SQLite</b> — on-server persistence for posts, messages metadata, transactions.</li>
            <li><b>bCrypt</b> — password hashing (client-side).</li>
          </ul>
          <p>We do NOT sell your data to any third party. Ever.</p>
        </>
      ),
      ar: (
        <>
          <p>نستخدم مجموعة محدودة من معالجات البيانات الموثوقة. يلتزم كلٌّ منهم باتفاقية معالجة بيانات وقد يعالج البيانات للغرض المعلن فقط:</p>
          <ul>
            <li><b>مزوّدو نماذج اللغة</b> (Groq، OpenAI، Google Gemini) — توليد محتوى التغذية، توصيات الأخبار، ردود الذكاء الاصطناعي. يُرسل نص طلبك فقط؛ لا بيانات حساب.</li>
            <li><b>Open-Meteo</b> — توقعات الطقس (اسم المدينة فقط).</li>
            <li><b>OpenStreetMap / Nominatim</b> — الترميز الجغرافي وخرائط المربعات.</li>
            <li><b>Prisma + SQLite</b> — تخزين على الخادم للمنشورات، وبيانات الرسائل، والمعاملات.</li>
            <li><b>bCrypt</b> — تجزئة كلمات المرور (على الجهاز).</li>
          </ul>
          <p>لا نبيع بياناتك لأي طرف ثالث. أبدًا.</p>
        </>
      ),
    },
  },
  {
    id: "retention",
    icon: Clock,
    title: { en: "6. Data Retention", ar: "٦. الاحتفاظ بالبيانات" },
    body: {
      en: (
        <>
          <p>We keep your data only as long as needed for the purpose it was collected:</p>
          <ul>
            <li><b>Account data</b> — until you delete your account.</li>
            <li><b>Messages</b> — until you delete the conversation; disappearing messages auto-delete per TTL.</li>
            <li><b>Posts, photos, videos</b> — until you delete them.</li>
            <li><b>Transactions</b> — 7 years (financial record-keeping law).</li>
            <li><b>Citizen Shield reports</b> — until case resolution + 3 years.</li>
            <li><b>Server logs (IP, rate-limit)</b> — 30 days.</li>
            <li><b>Analytics events</b> — 13 months, then aggregated and the raw events deleted.</li>
            <li><b>Brain on-device memory</b> — until you clear it or uninstall.</li>
          </ul>
          <p>When the retention period ends, data is securely deleted or fully anonymized.</p>
        </>
      ),
      ar: (
        <>
          <p>نحتفظ ببياناتك فقط طالما لزم الأمر للغرض الذي جُمعت من أجله:</p>
          <ul>
            <li><b>بيانات الحساب</b> — حتى تحذف حسابك.</li>
            <li><b>الرسائل</b> — حتى تحذف المحادثة؛ الرسائل المختفية تُحذف تلقائيًا وفق TTL.</li>
            <li><b>المنشورات والصور والفيديوهات</b> — حتى تحذفها.</li>
            <li><b>المعاملات</b> — ٧ سنوات (قانون حفظ السجلات المالية).</li>
            <li><b>بلاغات درع المواطن</b> — حتى حلّ القضية + ٣ سنوات.</li>
            <li><b>سجلات الخادم (IP، تحديد المعدل)</b> — ٣٠ يومًا.</li>
            <li><b>أحداث التحليلات</b> — ١٣ شهرًا، ثم تُجمّع وتُحذف الأحداث الخام.</li>
            <li><b>ذاكرة الدماغ على الجهاز</b> — حتى تمسحها أو تزيل التطبيق.</li>
          </ul>
          <p>عند انتهاء فترة الاحتفاظ، تُحذف البيانات بأمان أو تُجعل مجهولة الهوية بالكامل.</p>
        </>
      ),
    },
  },
  {
    id: "breach",
    icon: AlertTriangle,
    title: { en: "7. Breach Notification", ar: "٧. إبلاغ الخروقات" },
    body: {
      en: (
        <>
          <p>
            In the event of a personal data breach likely to result in a risk to your rights and freedoms,
            we will notify the relevant supervisory authority within 72 hours of becoming aware of it
            (GDPR Article 33), and notify affected users without undue delay (Article 34).
          </p>
          <p>
            Notifications will describe the nature of the breach, the likely consequences, the measures
            we are taking, and what you can do to protect yourself. We will deliver them via in-app
            banner, push notification, and (if you provided one) your recovery email.
          </p>
          <p>
            If you suspect a breach, contact <span className="font-mono text-secondary">security@cirkle.app</span> immediately.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            في حال وقوع خرق للبيانات الشخصية يُرجَّح أن يُلحق خطرًا بحقوقك وحرياتك،
            سنُبلِغ جهة الإشراف المختصة خلال ٧٢ ساعة من علمنا به (المادة ٣٣ من GDPR)،
            ونُبلِغ المستخدمين المتأثرين دون تأخير غير مبرَّر (المادة ٣٤).
          </p>
          <p>
            ستصف الإبلاغات طبيعة الخرق، والنتائج المحتملة، والتدابير المتخذة،
            وما يمكنك فعله لحماية نفسك. سنوصلها عبر لافتة داخل التطبيق، وإشعار،
            وبريد الاستعادة (إن وفّرته).
          </p>
          <p>
            إذا اشتبهت في خرق، تواصل مع <span className="font-mono text-secondary">security@cirkle.app</span> فورًا.
          </p>
        </>
      ),
    },
  },
  {
    id: "children",
    icon: Baby,
    title: { en: "8. Children's Privacy", ar: "٨. خصوصية الأطفال" },
    body: {
      en: (
        <>
          <p>Cirkle is not directed at children under 13. We do not knowingly collect personal data from children under 13 (COPPA). If we learn we have collected such data, we will delete it immediately.</p>
          <p>
            Users aged 13–15 may register only with verifiable parental consent. During registration we
            ask for your date of birth; if you are under 16, we require a parent or guardian&apos;s email
            address and send a verification link. The account is held in a <b>pending</b> state until
            the parent confirms.
          </p>
          <p>
            Once verified, teen accounts have additional safeguards:
          </p>
          <ul>
            <li>Direct messages default to contacts-only.</li>
            <li>Location sharing is off by default.</li>
            <li>AI personalization requires explicit opt-in (no default-on).</li>
            <li>Marketing communications are disabled.</li>
          </ul>
          <p>
            Parents may review, modify, or delete their child&apos;s data by contacting
            <span className="font-mono text-secondary">parents@cirkle.app</span>.
          </p>
        </>
      ),
      ar: (
        <>
          <p>دواير غير موجَّه للأطفال دون ١٣ سنة. لا نجمع عمدًا بيانات شخصية من الأطفال دون ١٣ (COPPA). إذا علمنا بجمع مثل هذه البيانات، نحذفها فورًا.</p>
          <p>
            يمكن للمستخدمين الذين تتراوح أعمارهم بين ١٣ و١٥ سنة التسجيل فقط بموافقة والد
            يمكن التحقق منها. أثناء التسجيل نطلب تاريخ ميلادك؛ إذا كنت دون ١٦، نطلب بريد
            والد أو وصيك ونرسل رابط تحقق. يُحفظ الحساب في حالة <b>معلّقة</b> حتى يؤكد الوالد.
          </p>
          <p>
            بعد التحقق، تُطبَّق على حسابات المراهقين ضمانات إضافية:
          </p>
          <ul>
            <li>الرسائل المباشرة افتراضيًا للمتراسلين فقط.</li>
            <li>مشاركة الموقع متوقفة افتراضيًا.</li>
            <li>تخصيص الذكاء الاصطناعي يتطلب اشتراكًا صريحًا (لا يُفعَّل افتراضيًا).</li>
            <li>الاتصالات التسويقية معطّلة.</li>
          </ul>
          <p>
            يمكن للوالدين مراجعة بيانات أطفالهم أو تعديلها أو حذفها بالتواصل مع
            <span className="font-mono text-secondary">parents@cirkle.app</span>.
          </p>
        </>
      ),
    },
  },
  {
    id: "transfers",
    icon: Globe,
    title: { en: "9. International Transfers", ar: "٩. النقل الدولي" },
    body: {
      en: (
        <>
          <p>
            Because Cirkle is a federated service, your data may be processed in the country you selected
            during registration (your &quot;data plane&quot;), and may transit through our LLM providers
            which operate servers in the EU, US, and other regions.
          </p>
          <p>
            We rely on the following transfer mechanisms:
          </p>
          <ul>
            <li><b>GDPR Standard Contractual Clauses</b> — between Cirkle and EU-based subprocessors.</li>
            <li><b>PDPL-approved transfer list</b> — for users in Saudi Arabia.</li>
            <li><b>Adequacy decisions</b> — where the destination country is recognized as providing adequate protection.</li>
          </ul>
          <p>
            To minimize transfers, Cirkle processes as much data as possible on-device. The Brain&apos;s
            personalization memory never leaves your device unless you explicitly opt in to Federated Learning
            (in which case only anonymized model weights are shared).
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            لأن دواير خدمة موحّدة، قد تُعالَج بياناتك في الدولة التي اخترتها عند التسجيل
            (&quot;مستوى البيانات&quot;)، وقد تمر عبر مزوّدي نماذج اللغة الذين يشغّلون خوادم في
            الاتحاد الأوروبي والولايات المتحدة ومناطق أخرى.
          </p>
          <p>نعتمد آليات النقل التالية:</p>
          <ul>
            <li><b>البنود التعاقدية النموذجية لـ GDPR</b> — بين دواير ومعالجات البيانات الأوروبية.</li>
            <li><b>قائمة النقل المعتمدة من PDPL</b> — لمستخدمي المملكة العربية السعودية.</li>
            <li><b>قرارات الكفاية</b> — عندما تُعترف الدولة الوجهة بأنها توفر حماية كافية.</li>
          </ul>
          <p>
            لتقليل النقل، تعالج دواير قدر الإمكان من البيانات على الجهاز. لا تغادر ذاكرة تخصيص
            الدماغ جهازك إلا إذا اشتركت صراحة في التعلّم الموحّد (وفي تلك الحالة تُشارك فقط
            أوزان النموذج المجهولة الهوية).
          </p>
        </>
      ),
    },
  },
  {
    id: "contact",
    icon: Mail,
    title: { en: "10. Contact", ar: "١٠. التواصل" },
    body: {
      en: (
        <>
          <p>
            Cirkle is operated by the Cirkle Cooperative. If you have questions about this policy or
            your personal data, contact:
          </p>
          <ul>
            <li><b>Data Protection Officer:</b> <span className="font-mono text-secondary">dpo@cirkle.app</span></li>
            <li><b>Security incidents:</b> <span className="font-mono text-secondary">security@cirkle.app</span></li>
            <li><b>Parental verifications:</b> <span className="font-mono text-secondary">parents@cirkle.app</span></li>
            <li><b>General:</b> <span className="font-mono text-secondary">hello@cirkle.app</span></li>
          </ul>
          <p>
            You also have the right to lodge a complaint with your local data protection authority
            (e.g. the Saudi SDAIA, the Egyptian NTRA, or your national DP authority) if you believe
            our processing of your data infringes applicable law.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            تُدير دواير تعاونية دواير. إذا كان لديك أسئلة حول هذه السياسة أو بياناتك
            الشخصية، تواصل مع:
          </p>
          <ul>
            <li><b>مسؤول حماية البيانات:</b> <span className="font-mono text-secondary">dpo@cirkle.app</span></li>
            <li><b>حوادث الأمان:</b> <span className="font-mono text-secondary">security@cirkle.app</span></li>
            <li><b>تحقيقات الوالدين:</b> <span className="font-mono text-secondary">parents@cirkle.app</span></li>
            <li><b>عام:</b> <span className="font-mono text-secondary">hello@cirkle.app</span></li>
          </ul>
          <p>
            يحق لك أيضًا تقديم شكوى إلى جهة حماية البيانات المحلية (مثل SDAIA السعودية،
            أو NTRA المصرية، أو سلطة حماية البيانات في بلدك) إذا رأيت أن معالجتنا
            لبياناتك تخالف القانون المعمول به.
          </p>
        </>
      ),
    },
  },
];

export function PrivacyPolicy({ open, onClose }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ intro: true });

  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));
  const isRtl = lang === "ar";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200]"
            style={{ background: "hsl(var(--charcoal) / 0.6)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-label="Privacy Policy"
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed inset-x-0 bottom-0 top-[4vh] z-[210] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-3xl mx-auto"
          >
            {/* Header */}
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">
                  {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {lang === "ar"
                    ? `الإصدار ${POLICY_VERSION} · محدّث ${LAST_UPDATED}`
                    : `Version ${POLICY_VERSION} · Updated ${LAST_UPDATED}`}
                </div>
              </div>
              <button
                onClick={() => setLang((l) => (l === "en" ? "ar" : "en"))}
                className="h-9 px-3 rounded-full glass flex items-center gap-1.5 hover:bg-muted/60 transition text-xs"
                aria-label="Toggle language"
              >
                <Languages className="w-3.5 h-3.5" />
                {lang === "en" ? "العربية" : "English"}
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Sections — accordion list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {SECTIONS.map((s) => {
                const isOpen = !!expanded[s.id];
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden transition",
                      isOpen ? "border-secondary/40 bg-secondary/5" : "border-border/60 bg-card/60",
                    )}
                  >
                    <button
                      onClick={() => toggle(s.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-start hover:bg-muted/40 transition"
                      aria-expanded={isOpen}
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0 font-medium text-sm">
                        {s.title[lang]}
                      </div>
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className={cn("w-4 h-4 text-muted-foreground", isRtl && "rotate-180")} />}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed space-y-2 [&_h4]:font-medium [&_h4]:text-foreground [&_h4]:text-xs [&_h4]:uppercase [&_h4]:tracking-widest [&_h4]:mt-3 [&_li]:ml-4">
                            {s.body[lang]}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Footer */}
              <div className="pt-4 pb-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
                Cirkle · دواير · Privacy-first
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
