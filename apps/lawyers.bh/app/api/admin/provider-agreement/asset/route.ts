import { endpoint, json, readBody } from "@/lib/provider-agreement/http";
import { normalizeAsset } from "@/lib/provider-agreement/assets";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(
    request,
    async () =>
      json({
        ok: true,
        dataUrl: await normalizeAsset(
          await readBody(request, 2 * 1024 * 1024),
          request.headers.get("content-type") ?? "",
        ),
      }),
    true,
  );
}
