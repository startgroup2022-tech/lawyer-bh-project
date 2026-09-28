export const runtime = "nodejs";

function backendOrigin(): string {
  const configured = process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh";
  const url = new URL(configured);

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }

  return url.origin;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return Response.json(
        { ok: false, success: false, code: "MULTIPART_REQUIRED" },
        { status: 415, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await request.formData();

    const headers = new Headers();
    headers.set("Accept", "application/json");
    headers.set("Cache-Control", "no-store");

    const response = await fetch(`${backendOrigin()}/api/legalsos/lawyers/register`, {
      method: "POST",
      headers,
      body,
    });

    const responseBody = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!responseBody) {
      return Response.json(
        { ok: false, success: false, error: "Invalid backend response" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const safeResponseBody = { ...responseBody };
    delete safeResponseBody.stack;

    return Response.json(safeResponseBody, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    console.error("[LegalSOS lawyer registration] backend request failed");

    return Response.json(
      { ok: false, success: false, error: "Unable to register lawyer from web portal" },
      { status: 502 },
    );
  }
}
