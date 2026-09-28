"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Refund & Return Policy",
    lastUpdated: "Last updated: 2025",
    intro: "This policy outlines the terms governing refunds and returns for services obtained through the Lawyers.bh platform.",
    generalRule: "General Rule",
    generalRuleText: "Fees you pay through the platform are final and non-refundable, unless the platform specifies otherwise in the cases outlined below.",
    fullRefundTitle: "Full Refund Eligible Cases",
    fullRefund: [
      "The user cancels the service request before the scheduled appointment date.",
      "The service provider cancels the appointment or fails to show up.",
      "A technical error on the platform results in duplicate or incorrect charges.",
    ],
    noRefundTitle: "Non-Refundable Cases",
    noRefund: [
      "Services that have already been rendered or consultations that have taken place.",
      "Cancellation requests made after the scheduled appointment time.",
      "Dissatisfaction with legal advice or outcomes of legal proceedings.",
      "Administrative fees and platform registration charges.",
    ],
    processTitle: "Refund Process",
    process: [
      "Refund requests must be submitted through the platform's contact channels.",
      "Refunds will be processed using the same payment method used for the original transaction.",
      "Processing time may take up to 14 business days depending on the payment provider.",
      "The platform reserves the right to investigate any refund request before processing.",
    ],
  },
  ar: {
    title: "سياسة الاسترداد والإرجاع",
    lastUpdated: "آخر تحديث: 2025",
    intro: "توضح هذه السياسة الشروط المتعلقة باسترداد المبالغ والإرجاع للخدمات المحصلة عبر منصة محامون السعودية.",
    generalRule: "القاعدة العامة",
    generalRuleText: "الرسوم التي تدفعها عبر المنصة نهائية وغير قابلة للاسترداد، ما لم تحدد المنصة خلاف ذلك في الحالات الموضحة أدناه.",
    fullRefundTitle: "حالات الاسترداد الكامل",
    fullRefund: [
      "إلغاء المستخدم لطلب الخدمة قبل تاريخ الموعد المحدد.",
      "إلغاء مقدم الخدمة للموعد أو عدم حضوره.",
      "خطأ تقني في المنصة يؤدي إلى رسوم مكررة أو غير صحيحة.",
    ],
    noRefundTitle: "الحالات غير القابلة للاسترداد",
    noRefund: [
      "الخدمات التي تم تقديمها بالفعل أو الاستشارات التي تمت.",
      "طلبات الإلغاء المقدمة بعد وقت الموعد المحدد.",
      "عدم الرضا عن المشورة القانونية أو نتائج الإجراءات القانونية.",
      "الرسوم الإدارية ورسوم التسجيل في المنصة.",
    ],
    processTitle: "عملية الاسترداد",
    process: [
      "يجب تقديم طلبات الاسترداد من خلال قنوات الاتصال بالمنصة.",
      "تتم معالجة المبالغ المستردة بنفس طريقة الدفع المستخدمة في المعاملة الأصلية.",
      "قد يستغرق وقت المعالجة حتى 14 يوم عمل حسب مزود الدفع.",
      "تحتفظ المنصة بالحق في التحقيق في أي طلب استرداد قبل معالجته.",
    ],
  },
};

export default function RefundPolicyPage() {
  const isAr = useLocale() === "ar";
  const c = isAr ? content.ar : content.en;

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-1">{c.title}</h1>
          <p className="text-sm text-text-muted mb-6">{c.lastUpdated}</p>
          <p className="text-text-muted leading-relaxed mb-10">{c.intro}</p>
        </motion.div>

        {/* General Rule */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 bg-primary/[0.04] border border-primary/10 rounded-xl p-5">
          <h2 className="font-bold text-text-primary mb-2">{c.generalRule}</h2>
          <p className="text-text-muted text-[15px]">{c.generalRuleText}</p>
        </motion.div>

        {/* Full Refund */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" /> {c.fullRefundTitle}
          </h2>
          <ul className="space-y-2.5">
            {c.fullRefund.map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-text-muted text-[15px]">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Non-Refundable */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-4">
            <XCircle className="w-5 h-5 text-red-500" /> {c.noRefundTitle}
          </h2>
          <ul className="space-y-2.5">
            {c.noRefund.map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-text-muted text-[15px]">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Process */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-lg font-bold text-text-primary mb-4">{c.processTitle}</h2>
          <ol className="space-y-2.5">
            {c.process.map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-md bg-primary/[0.07] text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-text-muted text-[15px]">{item}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </div>
  );
}
