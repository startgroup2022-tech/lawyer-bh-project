import type { ProviderBalancePublicStatus } from "@/lib/payments/provider-balances";

export function balanceCanPay(status: string) {
  return status === "pending_payment";
}

export function providerBalanceCopy(status: ProviderBalancePublicStatus, isAr: boolean) {
  const copy = {
    draft: {
      ar: ["الرابط غير مفعل", "يرجى طلب رابط دفع جديد من مقدم الخدمة."],
      en: ["Link not active", "Ask the service provider for a new payment link."],
    },
    pending_payment: {
      ar: ["اختر طريقة الدفع", "راجع تفاصيل المطالبة ثم اختر طريقة الدفع المناسبة."],
      en: ["Choose payment method", "Review the payment request, then select a payment method."],
    },
    paid: {
      ar: ["تم الدفع بنجاح", "تم تأكيد استلام المبلغ وحفظ الإيصال."],
      en: ["Payment successful", "The payment has been confirmed and the receipt is available."],
    },
    expired: {
      ar: ["انتهت صلاحية المطالبة", "اطلب من مقدم الخدمة إصدار رابط دفع جديد."],
      en: ["Payment request expired", "Ask the service provider to issue a new payment link."],
    },
    cancelled: {
      ar: ["تم إلغاء المطالبة", "لم تعد هذه المطالبة متاحة للدفع."],
      en: ["Payment request cancelled", "This payment request is no longer payable."],
    },
  }[status][isAr ? "ar" : "en"];

  return { title: copy[0], description: copy[1] };
}
