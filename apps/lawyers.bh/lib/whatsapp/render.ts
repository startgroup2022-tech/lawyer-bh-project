import type { WhatsAppOption, WhatsAppOutboundMessage } from "./contracts";

export const CURRENT_DATA_UNAVAILABLE = {
  ar: "تعذر جلب البيانات الحالية الآن. يمكنك المحاولة بعد قليل أو طلب التواصل مع فريق خدمة العملاء.",
  en: "I could not retrieve the current information. Please try again shortly or ask to speak with customer service.",
} as const;

export type ConsultationMethodView = {
  id: string;
  key: string;
  name: string;
  price: number;
  currencyCode: string;
  durationMinutes: number;
};

export function renderOptions(
  body: string,
  options: WhatsAppOption[],
  actionLabel?: string,
): Extract<WhatsAppOutboundMessage, { type: "interactive" }> {
  return {
    type: "interactive",
    body,
    mode: options.length <= 3 ? "button" : "list",
    options,
    actionLabel,
  };
}

export function renderConsultationMethods(
  language: "ar" | "en",
  methods: ConsultationMethodView[],
): WhatsAppOutboundMessage {
  if (methods.length === 0) {
    return { type: "text", text: CURRENT_DATA_UNAVAILABLE[language] };
  }

  const options = methods.map((method) => ({
    id: `method:${method.key}`,
    title: method.name,
    description:
      language === "ar"
        ? `${method.price} د.ب · ${method.durationMinutes} دقيقة`
        : `${method.price} ${method.currencyCode} · ${method.durationMinutes} minutes`,
  }));

  return renderOptions(
    language === "ar" ? "اختر نوع الاستشارة:" : "Choose a consultation type:",
    options,
    language === "ar" ? "عرض الخيارات" : "View options",
  );
}
