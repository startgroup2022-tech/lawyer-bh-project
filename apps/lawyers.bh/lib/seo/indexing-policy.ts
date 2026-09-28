import type { Metadata } from "next";

export const PRIVATE_ROUTE_PREFIXES = [
  "/api/", "/admin/", "/ar/admin", "/en/admin", "/provider-dashboard/", "/ar/provider-dashboard", "/en/provider-dashboard",
  "/ar/payment", "/en/payment", "/ar/booking-confirmed", "/en/booking-confirmed", "/ar/booking-review", "/en/booking-review",
  "/ar/agreement", "/en/agreement", "/ar/complete-profile", "/en/complete-profile", "/ar/sos/confirmed", "/en/sos/confirmed",
] as const;

export const privatePageRobots: NonNullable<Metadata["robots"]> = { index: false, follow: false, nocache: true };
