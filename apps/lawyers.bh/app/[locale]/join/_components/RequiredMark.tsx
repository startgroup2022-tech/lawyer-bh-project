export function RequiredMark({ locale }: { locale: "ar" | "en" }) {
  return (
    <>
      <span className="ms-1 text-red-600" aria-hidden="true">
        *
      </span>
      <span className="sr-only">
        {locale === "ar" ? "حقل إلزامي" : "Required"}
      </span>
    </>
  );
}
