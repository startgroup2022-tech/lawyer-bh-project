import type { PublicPolicyType } from "./types";
export const policyCatalog = {
  general: { path: "/terms", seo: "terms", ar: "الشروط والأحكام", en: "Terms & Conditions" },
  privacy: { path: "/privacy", seo: "privacy", ar: "سياسة الخصوصية", en: "Privacy Policy" },
  refund: { path: "/refund-policy", seo: "refundPolicy", ar: "سياسة الإلغاء والاسترداد", en: "Cancellation & Refund Policy" },
} as const;
export const publicPolicyTypes: PublicPolicyType[] = ["general", "privacy", "refund"];
export function publicPolicyType(value: unknown): PublicPolicyType {
  return value === "privacy" || value === "refund" ? value : "general";
}
export type PolicyPublication = { contentAr: string; contentEn: string; version: number; publishedAt: string | null };
export type PublicPolicyState = { status: "published"; publication: PolicyPublication } | { status: "missing" | "error" };
