import { training } from "@/lib/training/repository";
import { clientKey, endpoint, json, readJson } from "@/lib/training/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return endpoint(request, async () => {
    const body = await readJson(request);
    return json({ ok: true, ...await training.startUpload(body, body.files, clientKey(request)) }, 201);
  });
}
