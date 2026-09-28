import { careers } from "@/lib/careers/repository";
import { adminEndpoint, json } from "@/lib/careers/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminEndpoint(request, async () => {
    const p = new URL(request.url).searchParams;
    return json({ ok: true, ...await careers.listApplications({ jobId: p.get("jobId") || undefined, status: p.get("status") || undefined, query: p.get("query") || undefined, page: Number(p.get("page")) || 1 }) });
  });
}
