import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import YourGptPaymentContent from "./YourGptPaymentContent";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function YourGptPaymentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <YourGptPaymentContent />
    </Suspense>
  );
}
