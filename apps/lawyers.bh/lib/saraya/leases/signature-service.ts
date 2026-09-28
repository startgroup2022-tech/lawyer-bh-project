import { createHash, randomUUID } from "node:crypto";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { sanitizePublicOnboardingContext } from "../public-onboarding/audit";
import type { ContractRenderer, ContractSnapshot } from "./contract-renderer";

export interface SignatureInput { acceptedName: string; checksum: string; ip: string; userAgent?: string | null }
export interface PreparedSignature {
  kind: "prepare"; leaseId: string; propertyId: string; checksum: string; evidenceDigest: string;
  generatedAt: Date; snapshot: ContractSnapshot;
}
export type SignatureAcceptance =
  | PreparedSignature
  | { kind: "recover"; storageKey: string | null }
  | { kind: "pending"; leaseId: string; checksum: string; actorRole: string }
  | { kind: "active"; leaseId: string; documentId: string };
export interface SignatureRepository {
  accept(input: { principal: SarayaPrincipal; leaseId: string; acceptedName: string; checksum: string; evidenceDigest: string; ipAddress: string; userAgent: string | null }): Promise<SignatureAcceptance>;
  registerPreparedDocument(input: { leaseId: string; evidenceDigest: string; documentId: string; storageKey: string; documentChecksum: string; sizeBytes: number }): Promise<string>;
  complete(input: PreparedSignature & { principal: SarayaPrincipal; documentId: string; storageKey: string; documentChecksum: string; sizeBytes: number }): Promise<unknown>;
  resolveCompletion(input: { leaseId: string; evidenceDigest: string; storageKey: string; documentChecksum: string }): Promise<
    | { kind: "finalized"; result: { status: "active"; leaseId: string; documentId: string } }
    | { kind: "unreferenced" }
    | { kind: "recoverable" }
    | { kind: "unknown" }
  >;
  abort(leaseId: string, evidenceDigest: string): Promise<void>;
}
export interface FinalDocumentStorage { put(input: { key: string; contentType: string; body: Uint8Array; allowOverwrite?: boolean }): Promise<void>; delete(key: string): Promise<void> }

export function createLeaseSignatureService(repository: SignatureRepository, renderer: ContractRenderer, storage: FinalDocumentStorage) {
  return {
    async sign(principal: SarayaPrincipal, leaseId: string, input: SignatureInput) {
      const acceptedName = input.acceptedName.trim();
      if (acceptedName.length < 2 || acceptedName.length > 200) throw new ApiError(422, "INVALID_SIGNATURE_ACCEPTANCE", "اكتب الاسم القانوني كاملًا", "Enter the full legal name");
      if (!/^[0-9a-f]{64}$/i.test(input.checksum)) throw new ApiError(422, "INVALID_LEASE_CHECKSUM", "بصمة العقد غير صحيحة", "Invalid lease checksum");
      const context = sanitizePublicOnboardingContext({ ip: input.ip, userAgent: input.userAgent });
      const evidenceDigest = createHash("sha256").update(JSON.stringify({ leaseId, userId: principal.userId, acceptedName, checksum: input.checksum.toLowerCase(), ...context })).digest("hex");
      let accepted = await repository.accept({ principal, leaseId, acceptedName, checksum: input.checksum.toLowerCase(), evidenceDigest, ...context });
      if (accepted.kind === "recover") {
        if (accepted.storageKey) await Promise.resolve(storage.delete(accepted.storageKey)).catch(() => undefined);
        accepted = await repository.accept({ principal, leaseId, acceptedName, checksum: input.checksum.toLowerCase(), evidenceDigest, ...context });
        if (accepted.kind === "recover") throw new ApiError(409, "LEASE_FINALIZATION_CONFLICT", "تعذر إكمال توقيع العقد، حاول مجددًا", "Lease finalization conflicted; retry");
      }
      if (accepted.kind === "pending") return { status: "pending", leaseId, checksum: accepted.checksum, actorRole: accepted.actorRole };
      if (accepted.kind === "active") return { status: "active", leaseId, documentId: accepted.documentId };
      const rendered = await renderer.render({ ...accepted.snapshot, generatedAt: accepted.generatedAt }, accepted.checksum);
      const documentId = randomUUID();
      const storageKey = `saraya/${accepted.propertyId}/lease/${leaseId}/v1-final-${rendered.documentChecksum}.pdf`;
      const preparedDocumentId = await repository.registerPreparedDocument({ leaseId, evidenceDigest: accepted.evidenceDigest, documentId, storageKey, documentChecksum: rendered.documentChecksum, sizeBytes: rendered.bytes.length }) || documentId;
      try {
        await storage.put({ key: storageKey, body: rendered.bytes, contentType: "application/pdf", allowOverwrite: true });
      } catch (error) {
        await Promise.resolve(repository.abort(leaseId, accepted.evidenceDigest)).catch(() => undefined);
        throw error;
      }
      try {
        const result = await repository.complete({ ...accepted, principal, documentId: preparedDocumentId, storageKey, documentChecksum: rendered.documentChecksum, sizeBytes: rendered.bytes.length });
        return result;
      } catch (error) {
        let resolution = await repository.resolveCompletion({ leaseId, evidenceDigest: accepted.evidenceDigest, storageKey, documentChecksum: rendered.documentChecksum }).catch(() => ({ kind: "unknown" as const }));
        if (resolution.kind === "finalized") return resolution.result;
        if (resolution.kind === "recoverable") {
          await Promise.resolve(repository.abort(leaseId, accepted.evidenceDigest)).catch(() => undefined);
          resolution = await repository.resolveCompletion({ leaseId, evidenceDigest: accepted.evidenceDigest, storageKey, documentChecksum: rendered.documentChecksum }).catch(() => ({ kind: "unknown" as const }));
          if (resolution.kind === "finalized") return resolution.result;
        }
        if (resolution.kind === "unreferenced") {
          await Promise.resolve(storage.delete(storageKey)).catch(() => undefined);
        }
        throw error;
      }
    },
  };
}
