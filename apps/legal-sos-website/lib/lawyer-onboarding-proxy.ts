export function lawyerOnboardingBackendOrigin() {
  const configured =
    process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh";
  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return url.origin;
}

export async function safeBackendJson(response: Response) {
  return (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
}

export function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}
