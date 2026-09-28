import type { Locale } from "./i18n";

export type RefundSectionKey =
  | "general"
  | "full-refund"
  | "non-refundable"
  | "refund-process";

export interface RefundPolicyContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  owner: string;
  back: string;
  sections: readonly {
    key: RefundSectionKey;
    heading: string;
    body: string;
  }[];
}

const owner =
  "GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L";

const content: Record<Locale, RefundPolicyContent> = {
  ar: {
    title: "سياسة الاسترداد والإرجاع",
    subtitle:
      "توضح هذه السياسة الشروط المتعلقة باسترداد المبالغ والإرجاع للخدمات المحصلة عبر منصة LegalSOS.",
    lastUpdated: "آخر تحديث: 2025",
    owner,
    back: "العودة إلى الرئيسية",

    sections: [
      {
        key: "general",
        heading: "القاعدة العامة",
        body:
          "الرسوم التي تدفعها عبر المنصة نهائية وغير قابلة للاسترداد، ما لم تحدد المنصة خلاف ذلك في الحالات الموضحة أدناه.",
      },
      {
        key: "full-refund",
        heading: "حالات الاسترداد الكامل",
        body:
          "1. إلغاء المستخدم لطلب الخدمة قبل تاريخ الموعد المحدد.\n\n" +
          "2. إلغاء مقدم الخدمة للموعد أو عدم حضوره.\n\n" +
          "3. خطأ تقني في المنصة يؤدي إلى رسوم مكررة أو غير صحيحة.",
      },
      {
        key: "non-refundable",
        heading: "الحالات غير القابلة للاسترداد",
        body:
          "1. الخدمات التي تم تقديمها بالفعل أو الاستشارات التي تمت.\n\n" +
          "2. طلبات الإلغاء المقدمة بعد وقت الموعد المحدد.\n\n" +
          "3. عدم الرضا عن المشورة القانونية أو نتائج الإجراءات القانونية.\n\n" +
          "4. الرسوم الإدارية ورسوم التسجيل في المنصة.",
      },
      {
        key: "refund-process",
        heading: "عملية الاسترداد",
        body:
          "1. يجب تقديم طلبات الاسترداد من خلال قنوات الاتصال بالمنصة.\n\n" +
          "2. تتم معالجة المبالغ المستردة بنفس طريقة الدفع المستخدمة في المعاملة الأصلية.\n\n" +
          "3. قد يستغرق وقت المعالجة حتى 14 يوم عمل حسب مزود الدفع.\n\n" +
          "4. تحتفظ المنصة بالحق في التحقيق في أي طلب استرداد قبل معالجته.",
      },
    ],
  },

  en: {
    title: "Refund and Return Policy",
    subtitle:
      "This policy explains the terms relating to refunds and returns for services collected through the LegalSOS platform.",
    lastUpdated: "Last updated: 2025",
    owner,
    back: "Back to home",

    sections: [
      {
        key: "general",
        heading: "General Rule",
        body:
          "Fees paid through the platform are final and non-refundable unless otherwise specified by the platform in the cases described below.",
      },
      {
        key: "full-refund",
        heading: "Full Refund Cases",
        body:
          "1. The user cancels the service request before the scheduled appointment date.\n\n" +
          "2. The service provider cancels the appointment or fails to attend.\n\n" +
          "3. A technical error on the platform results in duplicate or incorrect charges.",
      },
      {
        key: "non-refundable",
        heading: "Non-Refundable Cases",
        body:
          "1. Services that have already been provided or consultations that have taken place.\n\n" +
          "2. Cancellation requests submitted after the scheduled appointment time.\n\n" +
          "3. Dissatisfaction with legal advice or the outcome of legal proceedings.\n\n" +
          "4. Administrative fees and platform registration fees.",
      },
      {
        key: "refund-process",
        heading: "Refund Process",
        body:
          "1. Refund requests must be submitted through the platform's official communication channels.\n\n" +
          "2. Refunds are processed using the same payment method used for the original transaction.\n\n" +
          "3. Processing may take up to 14 business days depending on the payment provider.\n\n" +
          "4. The platform reserves the right to investigate any refund request before processing it.",
      },
    ],
  },

  tr: {
    title: "İade ve Geri Ödeme Politikası",
    subtitle:
      "Bu politika, LegalSOS platformu üzerinden tahsil edilen hizmetlere ilişkin geri ödeme ve iade koşullarını açıklar.",
    lastUpdated: "Son güncelleme: 2025",
    owner,
    back: "Ana sayfaya dön",

    sections: [
      {
        key: "general",
        heading: "Genel Kural",
        body:
          "Platform üzerinden ödenen ücretler, aşağıda belirtilen durumlarda platform tarafından aksi belirtilmedikçe kesin ve iade edilemez niteliktedir.",
      },
      {
        key: "full-refund",
        heading: "Tam İade Durumları",
        body:
          "1. Kullanıcının hizmet talebini planlanan randevu tarihinden önce iptal etmesi.\n\n" +
          "2. Hizmet sağlayıcının randevuyu iptal etmesi veya randevuya katılmaması.\n\n" +
          "3. Platformdaki teknik bir hata nedeniyle mükerrer veya hatalı ücret tahsil edilmesi.",
      },
      {
        key: "non-refundable",
        heading: "İade Edilmeyen Durumlar",
        body:
          "1. Halihazırda sunulmuş hizmetler veya gerçekleştirilmiş danışmanlık hizmetleri.\n\n" +
          "2. Planlanan randevu saatinden sonra yapılan iptal talepleri.\n\n" +
          "3. Hukuki danışmanlıktan veya hukuki işlemlerin sonuçlarından memnun kalınmaması.\n\n" +
          "4. İdari ücretler ve platform kayıt ücretleri.",
      },
      {
        key: "refund-process",
        heading: "İade Süreci",
        body:
          "1. İade talepleri platformun resmi iletişim kanalları üzerinden yapılmalıdır.\n\n" +
          "2. İadeler, ilk işlemde kullanılan ödeme yöntemiyle gerçekleştirilir.\n\n" +
          "3. İşlem süresi ödeme sağlayıcısına bağlı olarak 14 iş gününe kadar sürebilir.\n\n" +
          "4. Platform, herhangi bir iade talebini işleme almadan önce inceleme hakkını saklı tutar.",
      },
    ],
  },
};

export function getRefundPolicyContent(
  locale: Locale
): RefundPolicyContent {
  return content[locale];
}