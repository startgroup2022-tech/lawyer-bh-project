import { careers } from "@/lib/careers/repository";
import { adminEndpoint, json, readJson } from "@/lib/careers/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminEndpoint(request, async () => json({ ok: true, ...await careers.listJobs(false, Number(new URL(request.url).searchParams.get("page")) || 1) }));
}
export async function POST(request: Request) {
  return adminEndpoint(request, async (adminId) => json({ ok: true, job: await careers.saveJob(await readJson(request), adminId) }, 201));
}
