import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import TermsAdminContent from "../LegalSOSTermsAdminContent";

export default async function Page({ params }: { params: Promise<{locale: string; document: string}> }) {
  const { locale, document } = await params;
  setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_terms_commissions"))) redirect(`/${locale}/admin`);
  if (document !== "terms" && document !== "privacy" && document !== "lawyer-agreement") notFound();
  return <TermsAdminContent isAr={locale === "ar"} documentType={document === "lawyer-agreement" ? "legalsos_lawyer_agreement" : document === "terms" ? "legalsos_terms" : "legalsos_privacy"} />;
}
