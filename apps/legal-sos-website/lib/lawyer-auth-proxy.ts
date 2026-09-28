import "server-only";

import { z } from "zod";

import type { LawyerRequestLists, LawyerSessionProfile } from "@/lib/lawyer-portal-types";

export type { LawyerRequestLists, LawyerSessionProfile } from "@/lib/lawyer-portal-types";

export const LAWYER_SESSION_COOKIE = "legalsos_lawyer_session";
export const LAWYER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const sessionSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
  nameAr: z.string(),
  nameEn: z.string(),
  email: z.string().email().nullable(),
  phone: z.string(),
  registrationNo: z.string(),
  status: z.string(),
  active: z.boolean(),
  emergencyReady: z.boolean(),
  isAvailable: z.boolean(),
  image: z.string().nullable(),
  rating: z.coerce.number(),
  totalRequests: z.coerce.number().int().nonnegative(),
  completedRequests: z.coerce.number().int().nonnegative(),
});

const locationSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  address: z.string().optional(),
});

const upstreamRequestsSchema = z.object({
  advocateOnline: z.boolean(),
  now: z.string(),
  pickups: z.array(z.object({
    id: z.string(),
    caseRef: z.string(),
    caseType: z.string(),
    baseFeeBhd: z.coerce.number(),
    createdAtIso: z.string(),
    lawyerResponseDeadlineIso: z.string().nullable(),
  })),
  activeCases: z.array(z.object({
    id: z.string(),
    caseRef: z.string(),
    caseType: z.string(),
    workflowType: z.string().nullable(),
    contactName: z.string().nullable(),
    location: locationSchema.nullable(),
    serviceStatus: z.string().nullable(),
    createdAtIso: z.string(),
  })),
  completedCases: z.array(z.object({
    id: z.string(),
    caseRef: z.string(),
    caseType: z.string(),
    workflowType: z.string().nullable(),
    serviceStatus: z.string().nullable(),
    createdAtIso: z.string(),
    completedAtIso: z.string().nullable(),
  })),
});

export function lawyerCookieOptions(environment = process.env.NODE_ENV) {
  return {
    httpOnly: true as const,
    secure: environment === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: LAWYER_SESSION_MAX_AGE_SECONDS,
  };
}

export function readLawyerToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  for (const item of cookie.split(";")) {
    const [rawName, ...rawValue] = item.trim().split("=");
    if (rawName === LAWYER_SESSION_COOKIE) {
      try {
        return decodeURIComponent(rawValue.join("=")) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function requireSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin) return fetchSite === null || fetchSite === "same-origin";

  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const expectedOrigin = forwardedHost
      ? `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`
      : requestUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function lawyerBackendUrl(path: string): URL {
  const configured = process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh";
  const base = new URL(configured);
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if (base.protocol !== "https:" && !(local && base.protocol === "http:")) {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return new URL(path, `${base.origin}/`);
}

export async function fetchLawyerBackend(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.delete("authorization");
  headers.set("Accept", "application/json");
  headers.set("Cache-Control", "no-store");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(lawyerBackendUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export function sanitizeLawyerSession(value: unknown): LawyerSessionProfile | null {
  const envelope = z.object({ lawyer: sessionSchema }).safeParse(value);
  return envelope.success ? envelope.data.lawyer : null;
}

export function sanitizeLawyerRequests(value: unknown): LawyerRequestLists | null {
  const parsed = upstreamRequestsSchema.safeParse(value);
  if (!parsed.success) return null;

  return {
    advocateOnline: parsed.data.advocateOnline,
    now: parsed.data.now,
    newOffers: parsed.data.pickups.map((item) => ({
      id: item.id,
      caseRef: item.caseRef,
      caseType: item.caseType,
      baseFeeBhd: item.baseFeeBhd,
      createdAt: item.createdAtIso,
      deadline: item.lawyerResponseDeadlineIso,
    })),
    activeCases: parsed.data.activeCases.map((item) => ({
      id: item.id,
      caseRef: item.caseRef,
      caseType: item.caseType,
      workflowType: item.workflowType,
      contactName: item.contactName,
      location: item.location,
      serviceStatus: item.serviceStatus,
      createdAt: item.createdAtIso,
    })),
    completedCases: parsed.data.completedCases.map((item) => ({
      id: item.id,
      caseRef: item.caseRef,
      caseType: item.caseType,
      workflowType: item.workflowType,
      serviceStatus: item.serviceStatus,
      createdAt: item.createdAtIso,
      completedAt: item.completedAtIso,
    })),
  };
}
