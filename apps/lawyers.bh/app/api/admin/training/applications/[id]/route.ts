import { training } from "@/lib/training/repository";
import { endpoint, json, readJson } from "@/lib/training/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return endpoint(request, async () => json({ ok: true, application: await training.getApplication((await context.params).id) }), true);
}
export async function PATCH(request: Request, context: Context) {
  return endpoint(request, async adminId => json({ ok: true, application: await training.reviewApplication((await context.params).id, await readJson(request), adminId) }), true);
}
