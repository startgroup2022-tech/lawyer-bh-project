import { careers } from "@/lib/careers/repository";
import { adminEndpoint, json, readJson } from "@/lib/careers/http";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminEndpoint(request, async (adminId) => {
    const body = await readJson(request);
    return json({ ok: true, job: await careers.saveJob(body, adminId, (await params).id, Number(body.version)) });
  });
}
