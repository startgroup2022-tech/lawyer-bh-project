import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import AboutAdminContent from "./AboutAdminContent";
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;setRequestLocale(locale);if(!(await requireAdminPermission("manage_about")))redirect(`/${locale}/admin`);return <AboutAdminContent isAr={locale==="ar"}/>}
