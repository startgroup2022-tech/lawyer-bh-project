import { careers } from "@/lib/careers/repository";
import { adminEndpoint, json, readJson } from "@/lib/careers/http";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminEndpoint(request, async (adminId) => {
    await careers.reviewApplication((await params).id, await readJson(request), adminId);
    return json({ ok: true });
  });
}
