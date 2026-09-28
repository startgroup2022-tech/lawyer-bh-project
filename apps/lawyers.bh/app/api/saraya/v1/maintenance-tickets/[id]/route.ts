import { updateMaintenanceTicket } from "@/lib/saraya/maintenance/http";
export const PATCH = async (request: Request, context: { params: Promise<{ id: string }> }) =>
  updateMaintenanceTicket(request, (await context.params).id);
