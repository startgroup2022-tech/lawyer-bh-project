import { training } from "@/lib/training/repository";
import { endpoint, json, readBytes } from "@/lib/training/http";
import { CHUNK_BYTES } from "@/lib/training/types";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };
export async function PUT(request: Request, context: Context) {
  return endpoint(request, async () => {
    const { token } = await context.params; const query = new URL(request.url).searchParams;
    await training.appendUpload(token, query.get("kind") ?? "", Number(query.get("offset") ?? NaN), await readBytes(request, CHUNK_BYTES));
    return json({ ok: true });
  });
}
export async function POST(request: Request, context: Context) {
  return endpoint(request, async () => json({ ok: true, ...await training.finalizeUpload((await context.params).token) }));
}
