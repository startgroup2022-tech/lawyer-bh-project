import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCurrentAdvocate } from "@/lib/sos/lawyerAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LawyerLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ expired?: string; sent?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // If already signed in, jump straight to the dashboard.
  const advocate = await getCurrentAdvocate();
  if (advocate) redirect(`/${locale}/sos/lawyer/dashboard`);

  const sp = await searchParams;
  return (
    <LoginForm
      expired={sp.expired === "1"}
      preSentMessage={sp.sent === "1"}
    />
  );
}
