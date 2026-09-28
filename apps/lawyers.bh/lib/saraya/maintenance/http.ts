import { ApiError } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { maintenanceRepository } from "./repository";
import { createMaintenanceService } from "./service";

const service = createMaintenanceService(maintenanceRepository);

function propertyIdOf(request: Request) {
  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    throw new ApiError(
      422,
      "PROPERTY_REQUIRED",
      "العقار مطلوب",
      "Property is required",
    );
  }
  return propertyId;
}

export const listMaintenanceTickets = (request: Request) =>
  handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    return Response.json({
      items: await service.list(principal, propertyIdOf(request)),
    });
  });

const mutation = async (request: Request) => {
  const body = await jsonBody(request);
  const priority = text(body, "priority") as "low" | "medium" | "high" | "urgent";
  if (!["low", "medium", "high", "urgent"].includes(priority)) throw new ApiError(422, "VALIDATION_ERROR", "الأولوية غير صالحة", "Priority is invalid");
  const statusValue = typeof body.status === "string" ? body.status : undefined;
  const statuses = ["open", "assigned", "in_progress", "awaiting_parts", "resolved", "closed", "cancelled"] as const;
  if (statusValue && !statuses.includes(statusValue as typeof statuses[number])) throw new ApiError(422, "VALIDATION_ERROR", "الحالة غير صالحة", "Status is invalid");
  return { title: text(body, "title"), description: text(body, "description"), priority, status: statusValue as typeof statuses[number] | undefined, expenseAmount: typeof body.expenseAmount === "string" ? body.expenseAmount : undefined };
};

export const createMaintenanceTicket = (request: Request) => handle(async () => {
  const principal = await requireSarayaPrincipal(request, sessions());
  return Response.json(await service.create(principal, propertyIdOf(request), await mutation(request)), { status: 201 });
});

export const updateMaintenanceTicket = (request: Request, id: string) => handle(async () => {
  const principal = await requireSarayaPrincipal(request, sessions());
  return Response.json(await service.update(principal, propertyIdOf(request), id, await mutation(request)));
});
