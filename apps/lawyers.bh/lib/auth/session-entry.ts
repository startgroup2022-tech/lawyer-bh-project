import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "./admin-access";
import {
  PROVIDER_SESSION_COOKIE,
  verifyProviderSessionValue,
} from "@/app/api/provider/_session";
import { getProviderAccessById } from "@/app/api/provider/_access";

/** Entry-page convenience only: dashboard and API authorization stays authoritative. */
export async function redirectAuthenticatedEntry(
  locale: string,
  role?: "admin" | "provider",
) {
  const language = locale === "en" ? "en" : "ar";
  if (role !== "provider") {
    const admin = await getCurrentAdmin();
    if (admin) redirect(`/${language}/admin`);
  }
  if (role === "admin") return;
  const jar = await cookies();
  const session = verifyProviderSessionValue(
    jar.get(PROVIDER_SESSION_COOKIE)?.value,
  );
  if (!session) return;
  const result = await getProviderAccessById(
    session.providerId,
    session.countryCode,
  );
  if (result?.provider.status === "approved" && result.provider.isActive) {
    redirect(`/${language}/provider-dashboard`);
  }
}
