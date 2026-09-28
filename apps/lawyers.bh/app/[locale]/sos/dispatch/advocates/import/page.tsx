import { setRequestLocale } from "next-intl/server";
import ImportView from "./ImportView";

// Auth enforced by proxy.ts middleware.
export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ImportView />;
}
