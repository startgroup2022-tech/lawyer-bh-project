import { itemHandlers } from "@/lib/saraya/property-management/http";
const handlers = itemHandlers("owners");
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
