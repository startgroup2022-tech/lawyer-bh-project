import { redirect } from "next/navigation";

// Older policy links point here; the published terms include the privacy policy.
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/terms`);
}
