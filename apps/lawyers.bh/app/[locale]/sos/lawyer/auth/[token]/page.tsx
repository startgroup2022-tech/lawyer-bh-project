import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  consumeMagicLinkToken,
  setAdvocateSession,
} from "@/lib/sos/lawyerAuth";

// Magic-link landing route. Uses the SAME path on the client side
// (so the email link works without an API hop), validates the token
// server-side, sets the session cookie, and redirects to the
// dashboard. Tokens are single-use only via their 15-minute expiry —
// we don't currently store consumed tokens, so a token can be reused
// inside its window. That's acceptable for v1; Phase 5 can add a
// nonce table for stricter single-use semantics.
export const dynamic = "force-dynamic";

export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const session = await consumeMagicLinkToken(token);
  if (!session) {
    redirect(`/${locale}/sos/lawyer/login?expired=1`);
  }
  await setAdvocateSession(session.advocateId, session.countryCode);
  redirect(`/${locale}/sos/lawyer/dashboard`);
}
