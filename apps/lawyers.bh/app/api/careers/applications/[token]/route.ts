import { careers } from "@/lib/careers/repository";
import { json, publicEndpoint, readBytes } from "@/lib/careers/http";
import { CV_CHUNK_BYTES } from "@/lib/careers/types";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };
export async function PUT(request: Request, { params }: Context) {
  return publicEndpoint(request, async () => {
    const { token } = await params;
    const offset = Number(new URL(request.url).searchParams.get("offset") ?? "invalid");
    await careers.appendUpload(token, offset, await readBytes(request, CV_CHUNK_BYTES));
    return json({ ok: true });
  });
}
export async function POST(request: Request, { params }: Context) {
  return publicEndpoint(request, async () => {
    const id = await careers.finalizeUpload((await params).token);
    return json({ ok: true, id });
  });
}
