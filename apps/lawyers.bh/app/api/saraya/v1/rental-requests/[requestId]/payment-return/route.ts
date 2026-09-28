import { paymentHandlers } from "@/lib/saraya/payments/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  return paymentHandlers.paymentReturn(request, (await context.params).requestId);
}
