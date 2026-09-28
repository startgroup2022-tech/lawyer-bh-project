type AvailabilityInput = {
  lawyerId: string;
  adminId: string;
  countryCode: string;
  available: boolean;
};

type Dependencies = {
  authorize(request: Request): Promise<{ id: string } | null>;
  setAvailability(input: AvailabilityInput): Promise<boolean>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };

export function createLawyerAvailabilityHttp(deps: Dependencies) {
  return async (request: Request, lawyerId: string): Promise<Response> => {
    const admin = await deps.authorize(request);
    if (!admin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
    if (!uuid.test(lawyerId) || Number(request.headers.get("content-length") || "0") > 1024) {
      return Response.json({ ok: false, error: "Invalid request" }, { status: 400, headers });
    }
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ ok: false, error: "Invalid request" }, { status: 400, headers });
    }
    const value = body as Record<string, unknown>;
    const countryCode = typeof value.countryCode === "string" ? value.countryCode.toUpperCase() : "";
    if (typeof value.available !== "boolean" || value.confirmed !== true || !/^[A-Z]{2}$/.test(countryCode)) {
      return Response.json({ ok: false, error: "Confirmation required" }, { status: 400, headers });
    }
    const updated = await deps.setAvailability({
      lawyerId, adminId: admin.id, countryCode, available: value.available,
    });
    if (!updated) return Response.json({ ok: false, error: "lawyer_unavailable" }, { status: 409, headers });
    return Response.json({ ok: true, available: value.available }, { headers });
  };
}
