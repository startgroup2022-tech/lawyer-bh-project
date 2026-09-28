import { setRequestLocale } from "next-intl/server";
import BookingReviewContent from "./Content";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookingReviewPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { token = "" } = await searchParams;

  setRequestLocale(locale);

  return <BookingReviewContent bookingId={id} token={token} />;
}
