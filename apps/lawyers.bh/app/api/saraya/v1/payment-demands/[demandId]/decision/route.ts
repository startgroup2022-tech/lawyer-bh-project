import { paymentHandlers } from "@/lib/saraya/payments/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ demandId: string }> }) {
  return paymentHandlers.offlineDecision(request, (await context.params).demandId);
}
