import { collectionHandlers } from "@/lib/saraya/property-management/http";
const handlers = collectionHandlers("owners");
export const GET = handlers.GET;
export const POST = handlers.POST;
