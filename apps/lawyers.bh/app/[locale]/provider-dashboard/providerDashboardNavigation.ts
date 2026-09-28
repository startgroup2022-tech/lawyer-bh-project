export type ProviderDashboardView = "home" | "requests" | "balances" | "profile";

export type ProviderDashboardCard = {
  view: Exclude<ProviderDashboardView, "home">;
  href: string;
  title: string;
  description: string;
};

export function providerDashboardCards(locale: string): ProviderDashboardCard[] {
  const normalizedLocale = locale === "ar" ? "ar" : "en";
  const isAr = normalizedLocale === "ar";
  const base = `/${normalizedLocale}/provider-dashboard`;

  return [
    {
      view: "requests",
      href: `${base}/requests`,
      title: isAr ? "طلباتي" : "My Requests",
      description: isAr ? "عرض الطلبات المدفوعة ومتابعة تفاصيلها." : "View confirmed paid requests and their details.",
    },
    {
      view: "balances",
      href: `${base}/balances`,
      title: isAr ? "الأرصدة وروابط الدفع" : "Balances & Payment Links",
      description: isAr ? "إنشاء الأرصدة وإرسال روابط الدفع وتنزيل المستندات." : "Create balances, share payment links, and download documents.",
    },
    {
      view: "profile",
      href: `${base}/profile`,
      title: isAr ? "الملف الشخصي" : "Profile",
      description: isAr ? "مراجعة بيانات الحساب وتحديث الملف الشخصي." : "Review account details and update your profile.",
    },
  ];
}
