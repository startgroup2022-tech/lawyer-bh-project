export function getAdminHeaderDestination(pathname: string, locale: string) {
  const normalizedPath = pathname.replace(/\/$/, "");
  const isRootDashboard = normalizedPath === `/${locale}/admin`;

  return isRootDashboard
    ? { href: "/", label: locale === "ar" ? "رجوع للموقع" : "Back to Website" }
    : { href: "/admin", label: locale === "ar" ? "لوحة التحكم" : "Dashboard" };
}
