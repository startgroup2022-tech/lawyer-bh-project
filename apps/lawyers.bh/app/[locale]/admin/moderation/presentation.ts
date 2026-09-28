const categories: Record<string, { ar: string; en: string }> = {
  harassment: { ar: "مضايقة أو إساءة", en: "Harassment or abuse" },
  threat_or_hate: { ar: "تهديد أو كراهية", en: "Threat or hate" },
  fraud_or_spam: { ar: "احتيال أو رسائل مزعجة", en: "Fraud or spam" },
  sexual_or_inappropriate: { ar: "محتوى جنسي أو غير لائق", en: "Sexual or inappropriate content" },
  privacy: { ar: "انتهاك الخصوصية", en: "Privacy violation" },
  other: { ar: "أخرى", en: "Other" },
};

const statuses: Record<string, { ar: string; en: string }> = {
  open: { ar: "مفتوح", en: "Open" },
  dismissed: { ar: "مرفوض", en: "Dismissed" },
  actioned: { ar: "تم اتخاذ إجراء", en: "Actioned" },
};

export function moderationCategoryLabel(value: string, isAr: boolean) {
  const label = categories[value] ?? categories.other;
  return isAr ? label.ar : label.en;
}

export function moderationStatusLabel(value: string, isAr: boolean) {
  const label = statuses[value] ?? statuses.open;
  return isAr ? label.ar : label.en;
}
