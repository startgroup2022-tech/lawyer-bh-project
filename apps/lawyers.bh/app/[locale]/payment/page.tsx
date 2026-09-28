import PaymentContent from "./PaymentContent";

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ balance?: string }> }) {
  const { balance } = await searchParams;
  return <PaymentContent balanceReference={balance?.trim() || undefined} />;
}
