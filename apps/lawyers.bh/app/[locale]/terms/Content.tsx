"use client";

import { motion } from "framer-motion";

export type PublicTerms = {
  content: string;
  version: number;
  publishedAt: string | null;
};

const content = {
  en: {
    title: "Terms & Conditions",
    subtitle: "Privacy Policy",
    lastUpdated: "Last updated: 2025",
    sections: [
      {
        heading: "Terms and Conditions",
        body: "By accessing and using the Lawyers.bh platform, you agree to be bound by these terms and conditions. These terms constitute a legally binding agreement between you and Saraya Square Foundation for Services Business (CR No. 96375-5), the owner of the platform.",
      },
      {
        heading: "Nature of Content",
        body: "The content provided on this platform may include text, data, graphics, images, and other materials. The platform acts as an intermediary connecting beneficiaries with licensed legal practitioners and does not itself provide legal services.",
      },
      {
        heading: "Privacy and Security Policy",
        body: "Information submitted through the platform is considered non-confidential unless explicitly agreed otherwise. The platform does not recommend specific lawyers or service providers. Users are responsible for their own selection of legal practitioners based on the information provided.",
      },
      {
        heading: "Payment Terms",
        body: "Payment for services may be made in cash directly to the service provider or through the platform's online payment system. The platform reserves the right to modify service fees at any time with prior notice.",
      },
      {
        heading: "User Registration",
        body: "Registration is not required to browse the platform. However, certain services may require user registration. Users must provide accurate and current information during registration.",
      },
      {
        heading: "Platform Liability",
        body: "The platform is not responsible for any agreements concluded between clients and lawyers outside the scope of the platform. The platform does not guarantee the outcome of any legal proceedings.",
      },
      {
        heading: "Choice of Law",
        body: "These terms shall be governed by and construed in accordance with the laws of the Kingdom of Bahrain. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of the Kingdom of Bahrain.",
      },
      {
        heading: "Amendments",
        body: "The platform reserves the right to amend these terms at any time. Continued use of the platform following any changes constitutes acceptance of the revised terms.",
      },
    ],
  },
  ar: {
    title: "الشروط والأحكام",
    subtitle: "سياسة الخصوصية",
    lastUpdated: "آخر تحديث: 2025",
    sections: [
      {
        heading: "الشروط والأحكام",
        body: "باستخدامك لمنصة محامون البحرين، فإنك توافق على الالتزام بهذه الشروط والأحكام. تشكل هذه الشروط اتفاقية ملزمة قانونياً بينك وبين مؤسسة ساريا سكوير لخدمات الأعمال (سجل تجاري رقم 96375-5)، مالكة المنصة.",
      },
      {
        heading: "طبيعة المحتوى",
        body: "قد يشمل المحتوى المقدم على هذه المنصة نصوصاً وبيانات ورسومات وصوراً ومواد أخرى. تعمل المنصة كوسيط يربط المستفيدين بالممارسين القانونيين المرخصين ولا تقدم بنفسها خدمات قانونية.",
      },
      {
        heading: "سياسة الخصوصية والأمان",
        body: "تعتبر المعلومات المقدمة عبر المنصة غير سرية ما لم يتم الاتفاق صراحة على خلاف ذلك. لا تقوم المنصة بتوصية محامين أو مقدمي خدمات محددين. يتحمل المستخدمون مسؤولية اختيارهم للممارسين القانونيين.",
      },
      {
        heading: "شروط الدفع",
        body: "يمكن الدفع مقابل الخدمات نقداً مباشرة لمقدم الخدمة أو من خلال نظام الدفع الإلكتروني للمنصة. تحتفظ المنصة بالحق في تعديل رسوم الخدمات في أي وقت مع إشعار مسبق.",
      },
      {
        heading: "تسجيل المستخدم",
        body: "لا يتطلب تصفح المنصة التسجيل. ومع ذلك، قد تتطلب بعض الخدمات تسجيل المستخدم. يجب على المستخدمين تقديم معلومات دقيقة وحديثة عند التسجيل.",
      },
      {
        heading: "مسؤولية المنصة",
        body: "المنصة غير مسؤولة عن أي اتفاقيات مبرمة بين العملاء والمحامين خارج نطاق المنصة. لا تضمن المنصة نتائج أي إجراءات قانونية.",
      },
      {
        heading: "القانون الواجب التطبيق",
        body: "تخضع هذه الشروط لقوانين مملكة البحرين وتُفسر وفقاً لها. تخضع أي نزاعات ناشئة عن هذه الشروط للاختصاص القضائي الحصري لمحاكم مملكة البحرين.",
      },
      {
        heading: "التعديلات",
        body: "تحتفظ المنصة بالحق في تعديل هذه الشروط في أي وقت. يعتبر الاستمرار في استخدام المنصة بعد أي تغييرات قبولاً بالشروط المعدلة.",
      },
    ],
  },
};

function PublishedText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return <div className="space-y-6">{blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const isList = lines.length > 0 && lines.every((line) => /^[-*•]\s+/.test(line));
    if (isList) {
      return <ul key={index} className="list-disc space-y-2 ps-6 text-[15px] leading-relaxed text-text-muted">
        {lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^[-*•]\s+/, "")}</li>)}
      </ul>;
    }
    return <p key={index} className="whitespace-pre-line text-[15px] leading-relaxed text-text-muted">{block}</p>;
  })}</div>;
}

export default function TermsPage({ locale, terms }: { locale: string; terms?: PublicTerms | null }) {
  const isAr = locale === "ar";
  const c = isAr ? content.ar : content.en;
  const publishedDate = terms?.publishedAt
    ? new Intl.DateTimeFormat(isAr ? "ar-BH" : "en-BH", { dateStyle: "long" }).format(new Date(terms.publishedAt))
    : null;

  return (
    <div className="py-16 lg:py-24" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-1">{c.title}</h1>
          <p className="text-primary font-semibold mb-1">{c.subtitle}</p>
          <p className="text-sm text-text-muted mb-10">
            {terms
              ? `${isAr ? "الإصدار" : "Version"} ${terms.version}${publishedDate ? ` · ${isAr ? "نُشر في" : "Published"} ${publishedDate}` : ""}`
              : c.lastUpdated}
          </p>
        </motion.div>

        {terms ? <PublishedText text={terms.content} /> : <div className="space-y-8">
          {c.sections.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-bold text-text-primary mb-2">{s.heading}</h2>
              <p className="text-text-muted leading-relaxed text-[15px]">{s.body}</p>
            </motion.div>
          ))}
        </div>}
      </div>
    </div>
  );
}
