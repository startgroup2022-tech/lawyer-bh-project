import OwnerHeader from "./OwnerHeader";

type Props = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function OwnerLayout({
  children,
  params,
}: Props) {
  const { locale } = await params;

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="
        min-h-screen
        bg-[#F4F7FA]
        text-text-primary
      "
    >

      {/* =====================================================
          OWNER HEADER
      ===================================================== */}

      <OwnerHeader locale={locale} />

      {/* =====================================================
          OWNER CONTENT
      ===================================================== */}

      <main className="min-h-[calc(100vh-78px)]">
        {children}
      </main>

    </div>
  );
}