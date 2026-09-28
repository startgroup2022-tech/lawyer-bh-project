import { paymentHandlers } from "@/lib/saraya/payments/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  return paymentHandlers.session(request, (await context.params).requestId);
}
