import type { SarayaPrincipal } from "../auth/contracts";
import { handle } from "../auth/http";

export function createGetLeaseDocumentRoute(dependencies: {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  download(principal: SarayaPrincipal, leaseId: string, final: boolean): Promise<{ bytes: Uint8Array; contentType: string; fileName: string }>;
}) {
  return (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => {
    const principal = await dependencies.authenticate(request);
    const final = new URL(request.url).searchParams.get("version") === "final";
    const document = await dependencies.download(principal, (await context.params).id, final);
    const fileName = document.fileName.replace(/[\r\n"\\]/g, "-");
    return new Response(Buffer.from(document.bytes), { headers: {
      "content-type": document.contentType,
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    } });
  });
}
