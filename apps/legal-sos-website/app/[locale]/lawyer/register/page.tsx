import { notFound } from "next/navigation";

import { LawyerOnboardingFlow } from "@/components/LawyerOnboardingFlow";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; previewState?: string }>;
};

export default async function LawyerRegistrationPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  const previewState =
    process.env.NODE_ENV === "development" &&
    (query.previewState === "profile_incomplete" ||
      query.previewState === "pending_approval")
      ? query.previewState
      : undefined;
  const token = typeof query.token === "string" ? query.token : "";

  return (
    <PublicSiteShell locale={locale} dictionary={dictionary}>
      <LawyerOnboardingFlow
        locale={locale}
        verificationToken={token}
        initialPreviewState={previewState}
      />
    </PublicSiteShell>
  );
}
