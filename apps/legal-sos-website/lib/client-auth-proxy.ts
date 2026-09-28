const LEGAL_SOS_CLIENT_TOKEN_KEY = "legal-sos-client-token";

export type ClientAuthMethod = "GET" | "POST" | "PATCH" | "DELETE";

function backendOrigin(): string {
  const configured = process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh";
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return url.origin;
}

export function tokenStorageKey() {
  return LEGAL_SOS_CLIENT_TOKEN_KEY;
}

function responseBodyText(response: Response): Promise<string> {
  return response.text();
}

export async function forwardClientAuthRequest(method: ClientAuthMethod, path: string, request: Request): Promise<Response> {
  let body: string | undefined;
  if (method !== "GET") {
    body = await request.text();
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Cache-Control", "no-store");

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  const response = await fetch(`${backendOrigin()}/api/mobile/client-auth/${path}`, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const payload = await responseBodyText(response);
  const contentTypeResponse = response.headers.get("content-type") || "application/json";

  return new Response(payload, {
    status: response.status,
    headers: {
      "Content-Type": contentTypeResponse,
      "Cache-Control": "no-store",
    },
  });
}
