import "server-only";

import type { TapConfig } from "./config";
import { sanitizeTapData } from "./sanitize";
import type {
  TapChargeInput,
  TapChargeResponse,
  TapDestinations,
  TapFileResponse,
  TapFileUploadInput,
  TapLeadResponse,
  TapRetailerLeadInput,
  TapRetailerResponse,
} from "./types";

const TAP_API_URL = "https://api.tap.company";
const REQUEST_TIMEOUT_MS = 20_000;

export class TapApiError extends Error {
  readonly name = "TapApiError";

  constructor(
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(`Tap API request failed with status ${status}`);
  }
}

export function createTapClient(config: TapConfig, fetchImpl: typeof fetch = fetch) {
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${config.secretKey}`);

    const response = await fetchImpl(`${TAP_API_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new TapApiError(response.status, sanitizeTapData(data));
    }

    return data as T;
  }

  function jsonRequest<T>(path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
    return request<T>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return {
    uploadFile(input: TapFileUploadInput): Promise<TapFileResponse> {
      const body = new FormData();
      body.set("purpose", input.purpose ?? "identity_document");
      body.set("file", input.file);
      body.set("title", input.title);
      body.set(
        "expires_at",
        String(Math.floor((input.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000)).getTime() / 1000)),
      );
      body.set("file_link_create", String(input.createLink ?? true));

      return request<TapFileResponse>("/v2/files/", { method: "POST", body });
    },

    createRetailerLead(input: TapRetailerLeadInput): Promise<TapLeadResponse> {
      return jsonRequest<TapLeadResponse>("/v3/lead/", "POST", input);
    },

    convertLeadToRetailer(input: { lead_id: string }): Promise<TapRetailerResponse> {
      return jsonRequest<TapRetailerResponse>("/v3/connect/account", "POST", input);
    },

    retrieveDestination(destinationId: string): Promise<{ id: string; status: string }> {
      return request(`/v2/destination/${encodeURIComponent(destinationId)}`, {
        method: "GET",
      });
    },

    createCharge(input: TapChargeInput): Promise<TapChargeResponse> {
      return jsonRequest<TapChargeResponse>("/v2/charges/", "POST", input);
    },

    retrieveCharge(chargeId: string): Promise<TapChargeResponse> {
      return request<TapChargeResponse>(
        `/v2/charges/${encodeURIComponent(chargeId)}`,
        { method: "GET" },
      );
    },

    updateChargeDestinations(chargeId: string, destinations: TapDestinations): Promise<TapChargeResponse> {
      return jsonRequest<TapChargeResponse>(
        `/v2/charges/${encodeURIComponent(chargeId)}`,
        "PUT",
        { destinations },
      );
    },
  };
}

export type TapClient = ReturnType<typeof createTapClient>;
export type * from "./types";
