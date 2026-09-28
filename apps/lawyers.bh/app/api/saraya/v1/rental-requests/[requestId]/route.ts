import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createRentalStatusHandler } from "@/lib/saraya/rentals/status-http";
import { rentalStatusRepository } from "@/lib/saraya/rentals/status-repository";
import { createRentalStatusService } from "@/lib/saraya/rentals/status-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const service = createRentalStatusService(rentalStatusRepository);
const getStatus = createRentalStatusHandler({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  read: service.read,
});

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  return getStatus(request, (await context.params).requestId);
}
