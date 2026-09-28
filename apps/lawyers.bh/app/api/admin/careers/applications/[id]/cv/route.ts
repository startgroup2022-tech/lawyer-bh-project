import { careers } from "@/lib/careers/repository";
import { adminEndpoint } from "@/lib/careers/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminEndpoint(request, async () => {
    const bytes = await careers.getCv((await params).id);
    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) {
      if (offset >= bytes.length) { controller.close(); return; }
      const end = Math.min(offset + 64 * 1024, bytes.length);
      controller.enqueue(Uint8Array.from(bytes.subarray(offset, end))); offset = end;
    } });
    return new Response(stream, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="application-cv.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "sandbox" } });
  });
}
