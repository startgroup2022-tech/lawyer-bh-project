import { setRequestLocale } from "next-intl/server";
import CompleteProfileContent from "./Content";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CompleteProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CompleteProfileContent />;
}
