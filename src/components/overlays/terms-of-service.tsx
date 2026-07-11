"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Scale, Languages, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Lang = "en" | "ar";

const TOS_VERSION = "1.0.0";
const LAST_UPDATED = "2025-01-15";

interface Clause {
  id: string;
  title: { en: string; ar: string };
  body: { en: React.ReactNode; ar: React.ReactNode };
}

const CLAUSES: Clause[] = [
  {
    id: "acceptance",
    title: { en: "1. Acceptance of Terms", ar: "١. قبول الشروط" },
    body: {
      en: (
        <>
          <p>
            By creating a Cirkle account or using any Cirkle service you agree to these Terms of Service
            and the Cirkle Privacy Policy. If you do not agree, do not use the service.
          </p>
          <p>
            If you are using Cirkle on behalf of an organization, you represent that you have authority
            to bind that organization to these Terms.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            بإنشاء حساب دواير أو استخدام أي خدمة من خدماتها فإنك توافق على شروط الخدمة هذه
            وعلى سياسة الخصوصية. إذا لم توافق، فلا تستخدم الخدمة.
          </p>
          <p>
            إذا كنت تستخدم دواير نيابةً عن مؤسسة، فتقرّ بأنك مخوّل بإلزام تلك المؤسسة بهذه الشروط.
          </p>
        </>
      ),
    },
  },
  {
    id: "account",
    title: { en: "2. Your Account", ar: "٢. حسابك" },
    body: {
      en: (
        <>
          <p>
            You must provide accurate information at registration, including your date of birth for
            age verification. You are responsible for keeping your password confidential and for all
            activity under your account.
          </p>
          <p>
            Cirkle enforces one account per human via Circle Verify. Creating multiple accounts,
            transferring accounts, or impersonating another person is prohibited and may result in
            immediate termination.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            يجب أن تقدم معلومات دقيقة عند التسجيل، بما في ذلك تاريخ ميلادك للتحقق من العمر.
            وأنت مسؤول عن الحفاظ على سرية كلمة المرور وعن كل النشاط تحت حسابك.
          </p>
          <p>
            تُلزم دواير بحساب واحد لكل إنسان عبر تحقّق دواير. إنشاء حسابات متعددة أو نقل
            الحسابات أو انتحال شخص آخر محظور وقد يؤدي إلى الإنهاء الفوري.
          </p>
        </>
      ),
    },
  },
  {
    id: "conduct",
    title: { en: "3. Acceptable Use", ar: "٣. الاستخدام المقبول" },
    body: {
      en: (
        <>
          <p>You agree NOT to:</p>
          <ul>
            <li>Use Cirkle to harass, threaten, or defame any person.</li>
            <li>Post content that is illegal, infringing, hateful, or sexual in nature involving minors.</li>
            <li>Spread deliberate disinformation or manipulate public discourse (Astroturfing, bot networks).</li>
            <li>Attempt to access another user&apos;s account, messages, or payment data.</li>
            <li>Reverse-engineer, scrape, or overload Cirkle infrastructure.</li>
            <li>Use Citizen Shield to file knowingly false reports.</li>
          </ul>
          <p>
            Violations may result in content removal, rate-limiting, temporary suspension, or permanent
            ban, decided by the Community Governance process.
          </p>
        </>
      ),
      ar: (
        <>
          <p>توافق على ألا:</p>
          <ul>
            <li>تستخدم دواير لمضايقة أو تهديد أو تشويه أي شخص.</li>
            <li>تنشر محتوى غير قانوني أو منتهكًا أو كراهيًا أو جنسيًا يتعلق بالقاصرين.</li>
            <li>تنشر معلومات مضلّلة عمدًا أو تتلاعب بالخطاب العام (شبكات بوت، Astroturfing).</li>
            <li>تحاول الوصول إلى حساب أو رسائل أو بيانات دفع مستخدم آخر.</li>
            <li>تفكّك دواير هندسيًا أو تكشط أو تُحمّل البنية التحتية بإفراط.</li>
            <li>تستخدم درع المواطن لتقديم بلاغات كاذبة عن علم.</li>
          </ul>
          <p>
            قد يؤدي المخالفة إلى إزالة المحتوى، أو تحديد المعدل، أو الإيقاف المؤقت، أو الحظر
            الدائم، يقرره إجراء الحوكمة المجتمعية.
          </p>
        </>
      ),
    },
  },
  {
    id: "content",
    title: { en: "4. Your Content & Licenses", ar: "٤. محتواك والترخيصات" },
    body: {
      en: (
        <>
          <p>
            You retain all ownership rights to content you create on Cirkle (posts, messages, photos,
            videos, reports). By posting, you grant Cirkle a worldwide, non-exclusive, royalty-free
            license to host, display, distribute, and process that content solely to operate the service.
          </p>
          <p>
            End-to-end encrypted Wasl messages are not accessible to Cirkle — we cannot read, moderate,
            or recover them. You are solely responsible for backing up your encryption keys.
          </p>
          <p>
            You may delete your content at any time. Account deletion permanently removes all your
            content from our servers within 30 days.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            تحتفظ بكل حقوق ملكية المحتوى الذي تنشئه على دواير (منشورات، رسائل، صور، فيديوهات،
            بلاغات). بالنشر، تمنح دواير ترخيصًا عالميًا غير حصري بدون إتاوة لاستضافة المحتوى
            وعرضه وتوزيعه ومعالجته فقط لتشغيل الخدمة.
          </p>
          <p>
            رسائل وصل المشفّأة طرف-طرف لا يمكن الوصول إليها من دواير — لا يمكننا قراءتها أو
            إدارتها أو استعادتها. وأنت مسؤول وحدك عن نسخ مفاتيح التشفير احتياطيًا.
          </p>
          <p>
            يمكنك حذف محتواك في أي وقت. حذف الحساب يزيل كل محتواك من خوادمنا نهائيًا خلال ٣٠ يومًا.
          </p>
        </>
      ),
    },
  },
  {
    id: "payments",
    title: { en: "5. Cirkle Pay", ar: "٥. دفع دواير" },
    body: {
      en: (
        <>
          <p>
            Cirkle Pay is a non-custodial payment interface. We do not hold your funds. Transactions
            settle directly between you, your counterparty, and the underlying payment rail (InstaPay,
            Fawry, Vodafone Cash, USDC, etc.).
          </p>
          <p>
            You are responsible for verifying the recipient handle before sending. Cirkle cannot
            reverse a settled transaction without the recipient&apos;s consent. Payment metadata is
            retained for 7 years as required by financial record-keeping law.
          </p>
          <p>
            Fees: Cirkle charges <b>zero fees</b> on standard transactions. Network fees from the
            underlying rail may apply and are displayed before confirmation.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            دفع دواير واجهة دفع غير أمينية. لا نحتفظ بأموالك. تتم التسوية مباشرة بينك وبين
            الطرف الآخر ومسار الدفع الأساسي (InstaPay، فوري، فودافون كاش، USDC، إلخ).
          </p>
          <p>
            أنت مسؤول عن التحقق من معرّف المستلم قبل الإرسال. لا يمكن لدواير عكس معاملة
            مُسوّاة بدون موافقة المستلم. تُحفظ بيانات المعاملات لمدة ٧ سنوات كما يتطلب قانون
            حفظ السجلات المالية.
          </p>
          <p>
            الرسوم: دواير تفرض <b>صفر رسوم</b> على المعاملات القياسية. قد تنطبق رسوم شبكة من
            المسار الأساسي وتُعرض قبل التأكيد.
          </p>
        </>
      ),
    },
  },
  {
    id: "verify",
    title: { en: "6. Circle Verify", ar: "٦. تحقّق دواير" },
    body: {
      en: (
        <>
          <p>
            Circle Verify issues zero-knowledge attestations (over-18, nationality, professional,
            unique-human). These attestations are cryptographic proofs — Cirkle does not store the
            underlying identity documents.
          </p>
          <p>
            Attempting to fraudulently obtain a verification (e.g. using a forged ID or someone
            else&apos;s biometrics) is grounds for permanent ban and may be reported to authorities.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            تحقّق دواير يصدر إثباتات بمعرفة صفريّة (فوق ١٨، الجنسية، المهنية، إنسان فريد).
            هذه الإثباتات أرقام تشفيرية — لا تخزّن دواير وثائق الهوية الأساسية.
          </p>
          <p>
            محاولة الحصول على تحقق بطريقة احتيالية (مثل استخدام هوية مزوّرة أو بصمات شخص آخر)
            تُعد سببًا للحظر الدائم وقد تُبلَّغ عنها السلطات.
          </p>
        </>
      ),
    },
  },
  {
    id: "disclaimer",
    title: { en: "7. Disclaimers", ar: "٧. إخلاء المسؤولية" },
    body: {
      en: (
        <>
          <p>
            Cirkle is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
            uninterrupted access, accuracy of AI-generated content, or compatibility with all devices.
          </p>
          <p>
            AI features (Brain, recommendations, summaries) may produce incorrect or biased output.
            You are responsible for verifying critical information before acting on it.
          </p>
          <p>
            Citizen Shield reports are user-generated. Cirkle does not endorse their accuracy and is
            not liable for consequences of acting on a report.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            تُقدَّم دواير &quot;كما هي&quot; بدون أي ضمانات. لا نضمن وصولًا متواصلًا، أو دقة
            محتوى الذكاء الاصطناعي، أو التوافق مع كل الأجهزة.
          </p>
          <p>
            قد تنتج ميزات الذكاء الاصطناعي (الدماغ، التوصيات، الملخصات) مخرجات غير صحيحة أو
            متحيّزة. أنت مسؤول عن التحقق من المعلومات الحرجة قبل التصرف بناءً عليها.
          </p>
          <p>
            بلاغات درع المواطن ينشئها المستخدمون. لا تؤيد دواير دقتها ولا تتحمل عواقب
            التصرف بناءً على بلاغ.
          </p>
        </>
      ),
    },
  },
  {
    id: "liability",
    title: { en: "8. Limitation of Liability", ar: "٨. تحديد المسؤولية" },
    body: {
      en: (
        <>
          <p>
            To the maximum extent permitted by law, Cirkle shall not be liable for any indirect,
            incidental, special, or consequential damages, including loss of profits, data, or
            goodwill, arising out of your use of the service.
          </p>
          <p>
            Our aggregate liability for any claim arising from these Terms is limited to the greater
            of (a) the amount you paid us in the past 12 months, or (b) USD 100.
          </p>
          <p>
            This section does not affect rights that cannot be excluded under applicable law (e.g.
            PDPL Article 17, GDPR Article 82).
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            إلى أقصى حد يسمح به القانون، لا تكون دواير مسؤولة عن أي أضرار غير مباشرة أو عرضية
            أو خاصة أو تبعية، بما في ذلك فقدان الأرباح أو البيانات أو السمعة، الناشئة عن
            استخدامك للخدمة.
          </p>
          <p>
            تقتصر مسؤوليتنا الإجمالية عن أي مطالبة تنشأ من هذه الشروط على الأكبر من:
            (أ) المبلغ الذي دفعته لنا في الـ١٢ شهرًا الماضية، أو (ب) ١٠٠ دولار أمريكي.
          </p>
          <p>
            لا يؤثر هذا القسم على الحقوق التي لا يمكن استبعادها بموجب القانون المعمول به
            (مثل المادة ١٧ من PDPL، والمادة ٨٢ من GDPR).
          </p>
        </>
      ),
    },
  },
  {
    id: "termination",
    title: { en: "9. Termination", ar: "٩. الإنهاء" },
    body: {
      en: (
        <>
          <p>
            You may delete your account at any time from Profile → Data Ownership → Delete my account.
            All your data is permanently removed from our servers within 30 days.
          </p>
          <p>
            We may suspend or terminate your account if you violate these Terms. We will provide
            notice and an opportunity to appeal unless urgent action is required to protect other
            users or comply with law.
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            يمكنك حذف حسابك في أي وقت من الملف → ملكية البيانات → حذف حسابي. تُزال كل
            بياناتك من خوادمنا نهائيًا خلال ٣٠ يومًا.
          </p>
          <p>
            قد نوقف حسابك أو ننهيه إذا خالفت هذه الشروط. سنمنحك إشعارًا وفرصة للطعن إلا إذا
            لزم إجراء عاجل لحماية مستخدمين آخرين أو الامتثال للقانون.
          </p>
        </>
      ),
    },
  },
  {
    id: "changes",
    title: { en: "10. Changes to These Terms", ar: "١٠. تغييرات على هذه الشروط" },
    body: {
      en: (
        <>
          <p>
            We may update these Terms from time to time. Material changes will be announced via
            in-app banner and (if provided) email at least 14 days before they take effect.
          </p>
          <p>
            Continued use of Cirkle after the effective date constitutes acceptance of the revised
            Terms. If you do not agree, you may delete your account before the effective date.
          </p>
          <p className="text-muted-foreground">
            Terms version: <span className="font-mono">{TOS_VERSION}</span> · Last updated: {LAST_UPDATED}
          </p>
        </>
      ),
      ar: (
        <>
          <p>
            قد نحدّث هذه الشروط من حين لآخر. تُعلن التغييرات الجوهرية عبر لافتة داخل التطبيق
            وبريد إلكتروني (إن وُفر) قبل ١٤ يومًا على الأقل من نفاذها.
          </p>
          <p>
            استمرارك في استخدام دواير بعد تاريخ النفاذ يُعد قبولًا للشروط المعدّلة. إذا لم
            توافق، يمكنك حذف حسابك قبل تاريخ النفاذ.
          </p>
          <p className="text-muted-foreground">
            إصدار الشروط: <span className="font-mono">{TOS_VERSION}</span> · آخر تحديث: {LAST_UPDATED}
          </p>
        </>
      ),
    },
  },
];

export function TermsOfService({ open, onClose }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ acceptance: true });
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
            aria-label="Terms of Service"
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed inset-x-0 bottom-0 top-[4vh] z-[210] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-3xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">
                  {lang === "ar" ? "شروط الخدمة" : "Terms of Service"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {lang === "ar"
                    ? `الإصدار ${TOS_VERSION} · محدّث ${LAST_UPDATED}`
                    : `Version ${TOS_VERSION} · Updated ${LAST_UPDATED}`}
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

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {CLAUSES.map((c) => {
                const isOpen = !!expanded[c.id];
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden transition",
                      isOpen ? "border-secondary/40 bg-secondary/5" : "border-border/60 bg-card/60",
                    )}
                  >
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-start hover:bg-muted/40 transition"
                      aria-expanded={isOpen}
                    >
                      <div className="flex-1 min-w-0 font-medium text-sm">{c.title[lang]}</div>
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
                          <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed space-y-2 [&_ul]:ml-4">
                            {c.body[lang]}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              <div className="pt-4 pb-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
                Cirkle · دواير · Free forever
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
