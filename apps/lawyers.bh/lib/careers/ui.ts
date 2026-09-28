export const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#082B67] outline-none focus:border-[#B4232A] focus:ring-4 focus:ring-red-50 disabled:opacity-60";
export const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#B4232A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#961c23] disabled:cursor-not-allowed disabled:opacity-50";
export const cardClass = "rounded-3xl border border-transparent bg-white p-6 text-[#082B67] shadow-sm transition hover:border-white";
export const statusLabels: Record<string, [string, string]> = { draft: ["مسودة", "Draft"], published: ["منشورة", "Published"], closed: ["مغلقة", "Closed"], archived: ["مؤرشفة", "Archived"], new: ["جديد", "New"], review: ["قيد المراجعة", "In review"], interview: ["مقابلة", "Interview"], accepted: ["مقبول", "Accepted"], rejected: ["مرفوض", "Rejected"], FULL_TIME: ["دوام كامل", "Full time"], PART_TIME: ["دوام جزئي", "Part time"], CONTRACTOR: ["تعاقد", "Contract"], INTERN: ["تدريب", "Internship"], TEMPORARY: ["مؤقت", "Temporary"], onsite: ["حضوري", "On-site"], remote: ["عن بُعد", "Remote"] };
export function label(value: string, ar: boolean) { return statusLabels[value]?.[ar ? 0 : 1] ?? value; }
export function errorMessage(code: string, ar: boolean) {
  const errors: Record<string, [string, string]> = {
    job_closed: ["انتهى التقديم لهذه الوظيفة. يمكنك استعراض الوظائف الأخرى.", "This position is no longer accepting applications."],
    already_applied: ["سبق تقديم طلب بهذا البريد لهذه الوظيفة.", "An application with this email already exists for this position."],
    rate_limited: ["وصلت إلى حد المحاولات. يرجى المحاولة بعد ساعة.", "Too many attempts. Please try again in an hour."],
    invalid_cv_size: ["اختر ملف PDF بحجم لا يتجاوز ٥ ميجابايت.", "Choose a PDF no larger than 5 MB."],
    invalid_pdf: ["تعذر قراءة الملف. ارفع سيرة ذاتية PDF صالحة وغير محمية بكلمة مرور.", "Upload a valid, non-password-protected PDF."],
    upload_expired: ["انتهت جلسة الرفع. أعد إرسال الطلب لبدء جلسة جديدة.", "Upload session expired. Submit again to start a new session."],
    invalid_deadline: ["اختر موعد إغلاق مستقبليًا قبل النشر.", "Choose a future closing date before publishing."],
    stale_record: ["تم تعديل السجل في مكان آخر. حدّث الصفحة قبل إعادة التعديل.", "This record changed elsewhere. Reload before editing again."],
    forbidden: ["ليست لديك صلاحية لهذا الإجراء. تحقق من تسجيل الدخول.", "You do not have permission. Check your login."],
  };
  return errors[code]?.[ar ? 0 : 1] ?? (ar ? "تعذر إتمام العملية. تحقق من البيانات والاتصال ثم أعد المحاولة." : "Could not complete this action. Check your details and connection, then retry.");
}
export async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error ?? "unavailable");
  return data;
}
