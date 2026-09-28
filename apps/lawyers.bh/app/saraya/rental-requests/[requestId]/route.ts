import { paymentReturnFallback } from "@/lib/saraya/mobile-association/http";

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  return paymentReturnFallback((await context.params).requestId, request.url);
}
