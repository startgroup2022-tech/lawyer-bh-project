type QueueDependencies = {
  authorize(request: Request): Promise<{ id: string } | null>;
  list(cursor: string | null): Promise<{ requests: Array<{ id: string; caseRef: string }>; nextCursor: string | null }>;
};

export function createEscalatedRequestsHttp(deps: QueueDependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store" };
    if (!(await deps.authorize(request))) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
    }
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (cursor && !decodeQueueCursor(cursor)) {
      return Response.json({ ok: false, error: "Invalid cursor" }, { status: 400, headers });
    }
    const result = await deps.list(cursor);
    return Response.json({ ok: true, ...result }, { headers });
  };
}
import { decodeQueueCursor } from "./queue-cursor";
