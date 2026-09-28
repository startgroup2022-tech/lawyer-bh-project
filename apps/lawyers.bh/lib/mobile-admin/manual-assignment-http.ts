import type { ManualAssignmentInput, ManualAssignmentResult } from "./manual-assignment";

type Dependencies = {
  authorize(request: Request): Promise<{ id: string } | null>;
  assign(input: ManualAssignmentInput): Promise<ManualAssignmentResult>;
  afterAssignment(input: { requestId: string; lawyerId: string }): Promise<{
    allocationRecorded: boolean; notificationsSent: boolean;
  }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };

export function createManualAssignmentHttp(deps: Dependencies) {
  return async (request: Request, requestId: string): Promise<Response> => {
    const admin = await deps.authorize(request);
    if (!admin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
    if (!uuid.test(requestId) || Number(request.headers.get("content-length") || "0") > 2048) {
      return Response.json({ ok: false, error: "Invalid request" }, { status: 400, headers });
    }
    const body: unknown = await request.json().catch(() => null);
    const lawyerId = body && typeof body === "object" && "lawyerId" in body ? body.lawyerId : null;
    if (typeof lawyerId !== "string" || !uuid.test(lawyerId)) {
      return Response.json({ ok: false, error: "Invalid request" }, { status: 400, headers });
    }
    let result: ManualAssignmentResult;
    try {
      result = await deps.assign({ requestId, lawyerId, adminId: admin.id });
    } catch (error) {
      const failure = error as { code?: string; cause?: { code?: string } };
      if (error instanceof Error && error.name === "AssignmentConflict" ||
          failure.code === "23505" || failure.cause?.code === "23505") {
        return Response.json({ ok: false, error: "request_unavailable" }, { status: 409, headers });
      }
      throw error;
    }
    if (result.status !== "assigned") {
      return Response.json({ ok: false, error: result.status }, { status: 409, headers });
    }
    const followUp = await deps.afterAssignment({ requestId, lawyerId }).catch(() => ({
      allocationRecorded: false, notificationsSent: false,
    }));
    return Response.json({ ok: true, status: "assigned", ...followUp }, { headers });
  };
}
