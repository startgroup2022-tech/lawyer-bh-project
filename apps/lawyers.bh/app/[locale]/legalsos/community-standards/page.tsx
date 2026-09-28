import { setRequestLocale } from "next-intl/server";

export default async function CommunityStandardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";
  const sections = ar ? [
    ["السلوك والمحتوى المحظور", "تُحظر المضايقة والتنمر والتهديد وخطاب الكراهية، والاحتيال والرسائل المزعجة، والمحتوى الجنسي أو غير اللائق، وانتهاك الخصوصية أو مشاركة بيانات الآخرين دون إذن، وأي محتوى غير قانوني."],
    ["الإبلاغ والحظر", "يمكن الإبلاغ عن المستخدم من قائمة الأمان داخل المحادثة. يصل البلاغ إلى الإدارة مع سياق محدود للمراجعة ولا يؤدي إلى الحظر تلقائيًا. الحظر إجراء منفصل يوقف الرسائل والملفات والمكالمات، بينما تبقى تفاصيل الطلب والموقع وحالة الخدمة متاحة."],
    ["المراجعة والإجراءات", "تراجع الإدارة البلاغات وتتخذ إجراءً مناسبًا وفي وقت معقول. قد ترفض البلاغ، أو تحذر المستخدم، أو تقرر تعطيل المحادثة مؤقتًا، أو توقف الحساب. تسجل الإجراءات لأغراض السلامة والتدقيق."],
    ["الاعتراض والتواصل", "يمكن الاعتراض على إجراء الإشراف أو طلب توضيح عبر قنوات الدعم المنشورة في التطبيق والموقع. يرجى ذكر رقم الطلب دون إرسال بيانات حساسة إضافية."],
    ["الخصوصية والاحتفاظ", "تستخدم بيانات البلاغ وسياق المحادثة المحدود للتحقيق ومنع الإساءة والامتثال. تخضع مدة الاحتفاظ والحذف لسياسة الخصوصية والمتطلبات القانونية وتسويات الطلبات."],
    ["حدود الطوارئ", "LegalSOS ليس بديلًا عن الشرطة أو الإسعاف أو خدمات الطوارئ. عند وجود خطر فوري اتصل بالجهة المختصة في مملكة البحرين."],
  ] : [
    ["Prohibited conduct and content", "Harassment, bullying, threats, hate, fraud, spam, sexual or inappropriate content, privacy violations, sharing another person's data without permission, and illegal content are prohibited."],
    ["Reporting and blocking", "Use the safety menu in chat to report a user. A report sends limited context to administration for review and does not block automatically. Blocking is separate and stops messages, files, and calls while request details, location, and service status remain available."],
    ["Review and enforcement", "Administration reviews reports and acts appropriately within a reasonable time. It may dismiss a report, warn a user, temporarily disable chat, or suspend an account. Actions are recorded for safety and audit."],
    ["Appeals and contact", "You may appeal a moderation action or request clarification through the support channels published in the app and website. Include the request reference without sending additional sensitive data."],
    ["Privacy and retention", "Report data and limited conversation context are used to investigate abuse, protect users, and comply with law. Retention and deletion follow the Privacy Policy, legal requirements, and request settlement obligations."],
    ["Emergency limitations", "LegalSOS is not an emergency service and does not replace police, ambulance, or emergency authorities. If there is immediate danger, contact the competent authority in the Kingdom of Bahrain."],
  ];
  return <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-[#07111f] px-5 py-12 text-white">
    <article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10">
      <p className="text-sm font-bold text-[#d7aa50]">LegalSOS</p>
      <h1 className="mt-2 text-3xl font-black">{ar ? "معايير المجتمع وسلامة المحادثة" : "Community Standards & Chat Safety"}</h1>
      <p className="mt-4 leading-8 text-white/70">{ar ? "باستخدام المحادثة، يوافق العميل والمحامي على هذه المعايير وعلى الشروط والأحكام وسياسة الخصوصية." : "By using chat, clients and lawyers agree to these standards, the Terms of Use, and the Privacy Policy."}</p>
      <div className="mt-8 space-y-7">{sections.map(([title, body]) => <section key={title}><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 leading-8 text-white/75">{body}</p></section>)}</div>
      <nav className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <a className="rounded-xl border border-white/15 px-4 py-2" href={`/${locale}/legalsos/legal/terms`}>{ar ? "الشروط والأحكام" : "Terms of Use"}</a>
        <a className="rounded-xl border border-white/15 px-4 py-2" href={`/${locale}/legalsos/legal/privacy`}>{ar ? "سياسة الخصوصية" : "Privacy Policy"}</a>
      </nav>
    </article>
  </main>;
}
