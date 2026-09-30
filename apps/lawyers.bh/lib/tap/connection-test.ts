import "server-only";

import type { TapEnvironment } from "./settings";

const TAP_BASE_URL = "https://api.tap.company/v2";

export type TapConnectionResult = {
  status: "connected" | "failed";
  message: string;
};

/**
 * Verifies a Tap secret key against the live API.
 *
 * Tap has no dedicated "who am I" endpoint, so this probes a charge lookup: an
 * authenticated key gets a 404 for a charge that does not exist, while a bad or
 * revoked key gets a 401. That distinguishes "credentials work" from "Tap is
 * unreachable", which a plain network check could not.
 */
export async function testTapConnection(input: {
  environment: TapEnvironment;
  secretKey: string;
  fetchImpl?: typeof fetch;
}): Promise<TapConnectionResult> {
  const doFetch = input.fetchImpl ?? fetch;
  const probeId = `lawyers_bh_connection_probe_${Date.now()}`;

  let response: Response;
  try {
    response = await doFetch(`${TAP_BASE_URL}/charges/${encodeURIComponent(probeId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${input.secretKey}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    return {
      status: "failed",
      message: `Tap is unreachable: ${error instanceof Error ? error.message : "network error"}`,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return { status: "failed", message: `Tap rejected the ${input.environment} secret key (${response.status})` };
  }

  if (response.status >= 500) {
    return { status: "failed", message: `Tap returned a server error (${response.status})` };
  }

  // 404 (unknown charge) and 200 (unlikely id collision) both prove the key
  // authenticated successfully.
  return { status: "connected", message: `Tap accepted the ${input.environment} secret key` };
}
