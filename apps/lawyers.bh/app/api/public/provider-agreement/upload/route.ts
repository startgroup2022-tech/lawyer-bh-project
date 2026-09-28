import { agreementFiles } from "@/lib/provider-agreement/repository";
import {
  endpoint,
  json,
  readJson,
  readBody,
} from "@/lib/provider-agreement/http";
import { AgreementError } from "@/lib/provider-agreement/model";
import { AGREEMENT_CHUNK_BYTES } from "@/lib/provider-agreement/builder-files";
import { clientKey } from "@/lib/training/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(request, async () => {
    const b = await readJson(request, 10000);
    if (b.action === "start")
      return json({
        ok: true,
        ...(await agreementFiles.start(
          b.versionId as string,
          clientKey(request),
        )),
      });
    if (b.action === "file")
      return json({
        ok: true,
        ...(await agreementFiles.beginFile(b.token as string, {
          fieldId: b.fieldId,
          name: b.name,
          mime: b.mime,
          size: b.size,
        })),
      });
    if (b.action === "finish")
      return json({
        ok: true,
        ...(await agreementFiles.finish(b.token as string, b.fileId as string)),
      });
    throw new AgreementError("invalid_action");
  });
}
export async function PATCH(request: Request) {
  return endpoint(request, async () => {
    const bytes = await readBody(request, AGREEMENT_CHUNK_BYTES);
    const offset = request.headers.get("x-upload-offset");
    if (offset === null || !/^\d+$/.test(offset))
      throw new AgreementError("invalid_chunk");
    await agreementFiles.append(
      request.headers.get("x-upload-token") ?? "",
      request.headers.get("x-file-id") ?? "",
      Number(offset),
      bytes,
    );
    return json({ ok: true });
  });
}
