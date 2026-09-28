import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { checkDispatchAuth } from "@/lib/sos/dispatchAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function DispatchLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in? Hop straight to the dashboard (or the page the
  // operator was originally trying to reach).
  const auth = await checkDispatchAuth();
  const sp = await searchParams;
  if (auth.ok) {
    const next = sp.next && sp.next.startsWith("/") ? sp.next : `/${locale}/sos/dispatch`;
    redirect(next);
  }

  return (
    <LoginForm
      next={sp.next ?? null}
      hadError={sp.error === "1"}
    />
  );
}
