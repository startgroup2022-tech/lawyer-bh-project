import { training } from "@/lib/training/repository";
import { endpoint, privateHeaders } from "@/lib/training/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  return endpoint(request, async () => {
    const { id, kind } = await context.params; const file = await training.attachment(id, kind);
    // Stream downloads too: a valid 5 MiB PDF exceeds Vercel's buffered response limit.
    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) {
      if (offset >= file.bytes.length) { controller.close(); return; }
      const end = Math.min(offset + 64 * 1024, file.bytes.length);
      controller.enqueue(new Uint8Array(file.bytes.subarray(offset, end))); offset = end;
    } });
    return new Response(stream, { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file.reference}-${file.kind}.pdf"` } });
  }, true);
}
