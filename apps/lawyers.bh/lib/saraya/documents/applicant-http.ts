import type { SarayaPrincipal } from "../auth/contracts";
import { handle } from "../auth/http";
import { ApiError } from "../auth/contracts";
import { createHash } from "node:crypto";
import type { ApplicantDocumentUploadInput, ApplicantUploadReservation } from "./service";
import { readApplicantDocumentUpload } from "./upload-form";

interface ApplicantDocumentHandlerDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  clientIp(request: Request): string;
  findReplay(principal: SarayaPrincipal, unitId: string, idempotencyKey: string, fingerprint: string): Promise<unknown | null>;
  reserveApplicantUpload(principal: SarayaPrincipal, unitId: string, ip: string): Promise<ApplicantUploadReservation>;
  createApplicant(principal: SarayaPrincipal, reservation: ApplicantUploadReservation, input: ApplicantDocumentUploadInput, idempotencyKey: string, fingerprint: string): Promise<unknown>;
}

function fingerprint(unitId: string, input: ApplicantDocumentUploadInput) {
  const bytes = createHash("sha256").update(input.body).digest("hex");
  return createHash("sha256").update(JSON.stringify({
    unitId: unitId.toLowerCase(), category: input.category, title: input.title.trim(),
    originalName: input.originalName, contentType: input.contentType, bytes,
  })).digest("hex");
}

export function createApplicantDocumentHandler(dependencies: ApplicantDocumentHandlerDependencies) {
  return (request: Request, unitId: string) => handle(async () => {
    const principal = await dependencies.authenticate(request);
    const key = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!key || key.length > 128) throw new ApiError(422, "INVALID_IDEMPOTENCY_KEY", "مفتاح الطلب غير صالح", "Invalid idempotency key");
    const upload = await readApplicantDocumentUpload(request);
    const digest = fingerprint(unitId, upload);
    const replay = await dependencies.findReplay(principal, unitId, key, digest);
    if (replay) return Response.json(replay);
    const reservation = await dependencies.reserveApplicantUpload(
      principal,
      unitId,
      dependencies.clientIp(request),
    );
    const created = await dependencies.createApplicant(
      principal,
      reservation,
      upload,
      key,
      digest,
    );
    return Response.json(created, { status: 201 });
  });
}
