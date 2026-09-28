import { timingSafeEqual } from "node:crypto";
import { cleanupPrivateUploads } from "@/lib/uploads/documents";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`),
    actual = Buffer.from(request.headers.get("authorization") || "");
  if (
    !process.env.CRON_SECRET ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return new Response(null, { status: 401 });
  return Response.json(await cleanupPrivateUploads());
}
