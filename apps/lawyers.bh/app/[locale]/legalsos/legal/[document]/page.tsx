import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPublishedTerms } from "@/lib/terms-management/service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: {params: Promise<{locale: string; document: string}>}) {
  const {locale, document} = await params;
  if (document !== "terms" && document !== "privacy") notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const version = await getPublishedTerms(document === "terms" ? "legalsos_terms" : "legalsos_privacy");
  const title = document === "terms" ? (ar ? "الشروط والأحكام" : "Terms and conditions") : (ar ? "سياسة الخصوصية" : "Privacy policy");
  return <main dir={ar ? "rtl" : "ltr"} className="mx-auto max-w-3xl px-6 py-12">
    <p className="mb-3 text-sm">{ar ? "النجدة القانونية" : "LegalSOS"}</p>
    <h1 className="mb-6 text-3xl font-bold">{title}</h1>
    {version ? <>
      <p className="mb-6 text-sm">{ar ? "الإصدار" : "Version"} {version.version}</p>
      <article className="whitespace-pre-wrap text-base leading-8">{ar ? version.contentAr : version.contentEn}</article>
    </> : <p role="status">{ar ? "المحتوى غير متاح حاليًا. يرجى المحاولة لاحقًا." : "Content is currently unavailable. Please try again later."}</p>}
    <section className="mt-10 border-t pt-8">
      <h2 className="text-xl font-bold">
        {document === "terms"
          ? (ar ? "المحادثة ومعايير المجتمع" : "Chat and Community Standards")
          : (ar ? "بيانات السلامة والإشراف" : "Safety and moderation data")}
      </h2>
      {document === "terms" ? <>
        <p className="mt-3 leading-8">{ar
          ? "تُعد معايير المجتمع جزءًا من هذه الشروط. قبل إرسال أي محتوى، يوافق المستخدم على عدم إرسال مضايقات أو تهديدات أو كراهية أو احتيال أو رسائل مزعجة أو محتوى جنسي أو غير لائق أو انتهاكات للخصوصية أو محتوى غير قانوني. يوفر التطبيق الإبلاغ والحظر كإجراءين منفصلين، وقد تحذر الإدارة المستخدم أو تعطل المحادثة مؤقتًا أو توقف الحساب."
          : "Community Standards form part of these Terms. Before sending any content, users agree not to submit harassment, threats, hate, fraud, spam, sexual or inappropriate material, privacy violations, or illegal content. The app provides clearly separated reporting and blocking controls, and administration may warn a user, temporarily disable chat, or suspend an account."}</p>
        <a className="mt-4 inline-block font-bold underline" href={`/${locale}/legalsos/community-standards`}>{ar ? "قراءة معايير المجتمع" : "Read Community Standards"}</a>
      </> : <>
        <p className="mt-3 leading-8">{ar
          ? "عند استخدام الإبلاغ، نعالج بيانات البلاغ وسبب البلاغ والوصف الاختياري وهوية طرفي الطلب وسياق محدود من المحادثة كان موجودًا وقت البلاغ. تستخدم هذه البيانات لحماية المستخدمين والتحقيق في الإساءة وفرض الشروط والامتثال للالتزامات القانونية. لا نضع وصف البلاغ أو مقتطفات المحادثة داخل إشعارات الدفع. قد نحتفظ بسجل الإشراف لمدة لازمة للسلامة ومنع الاحتيال وتسوية النزاعات والمتطلبات القانونية، ثم نحذفه أو نزيل ما يعرّف بالشخص وفق سياسة الحذف المعمول بها."
          : "When reporting is used, we process report details, the selected reason, optional description, request-participant identifiers, and limited conversation context that existed when the report was filed. We use this data to protect users, investigate abuse, enforce the Terms, and comply with law. Report descriptions and chat excerpts are not included in push notifications. Moderation records may be retained as needed for safety, fraud prevention, dispute handling, and legal obligations, then deleted or de-identified under the applicable deletion policy."}</p>
        <a className="mt-4 inline-block font-bold underline" href={`/${locale}/legalsos/community-standards`}>{ar ? "معايير المجتمع وسلامة المحادثة" : "Community Standards & Chat Safety"}</a>
      </>}
    </section>
  </main>;
}
