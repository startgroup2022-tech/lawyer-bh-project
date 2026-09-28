import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import Content from "./Content";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_lawyers"))) redirect(`/${locale}/admin`);

  return buildPageMetadata("join", locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Content />;
}
