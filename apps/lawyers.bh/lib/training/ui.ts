export { apiJson, inputClass, buttonClass, cardClass, label } from "@/lib/careers/ui";
export function trainingError(code: string, ar: boolean) {
  const messages: Record<string, [string, string]> = {
    invalid_files: ["اختر السيرة الذاتية، ورسالة الجامعة إن رغبت، بصيغة PDF حتى ٥ ميجابايت لكل ملف.", "Choose a CV and optional university letter as PDFs, up to 5 MB each."],
    invalid_pdf: ["أحد المرفقات غير صالح. اختر ملفات PDF قابلة للقراءة وغير محمية بكلمة مرور.", "A file is invalid. Choose readable PDFs without password protection."],
    invalid_date: ["اختر تاريخ بدء صحيحًا، اليوم أو بعده بتوقيت البحرين.", "Choose a valid start date, today or later in Bahrain time."],
    invalid_duration: ["مدة التدريب من أسبوع إلى ٥٢ أسبوعًا، بأرقام صحيحة.", "Training duration must be a whole number from 1 to 52 weeks."],
    invalid_field: ["حدد مجال التدريب عند اختيار «أخرى».", "Specify the training field when choosing Other."],
    invalid_phone: ["أدخل رقم هاتف صحيحًا مع رمز الدولة، مثل ‎+97333333333.", "Enter a valid phone number with country code, e.g. +97333333333."],
    invalid_email: ["أدخل بريدًا إلكترونيًا صحيحًا.", "Enter a valid email address."],
    invalid_consent: ["أكد موافقتك على استخدام البيانات لدراسة طلب التدريب.", "Confirm consent to use your information to review this training application."],
    rate_limited: ["وصلت إلى حد المحاولات. حاول مجددًا بعد ساعة.", "Too many attempts. Please try again in an hour."],
    upload_expired: ["انتهت جلسة الرفع. اضغط إرسال لبدء جلسة جديدة.", "Your upload session expired. Submit again to start a new session."],
    stale_record: ["تم تحديث الطلب في مكان آخر. أعد تحميل تفاصيله قبل التعديل.", "This application changed elsewhere. Reload its details before editing."],
    forbidden: ["ليست لديك صلاحية لهذا الإجراء. تحقق من تسجيل الدخول.", "You do not have permission for this action. Check your login."],
    not_found: ["الطلب أو المرفق غير موجود.", "The application or attachment was not found."],
    incomplete_upload: ["لم يكتمل رفع المرفقات. أعد المحاولة مع إبقاء الصفحة مفتوحة.", "Attachments are incomplete. Retry without closing this page."],
  };
  return messages[code]?.[ar ? 0 : 1] ?? (ar ? "تعذر إتمام العملية. راجع البيانات والاتصال وحاول مجددًا." : "Could not complete this action. Check your information and connection, then retry.");
}
export function typeLabel(type: string, ar: boolean) { return type === "law" ? (ar ? "تدريب محاماة" : "Legal training") : (ar ? "أخرى" : "Other"); }
