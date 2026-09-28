import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { requestIp } from "../auth/security";
import { createApplicantDocumentHandler } from "./applicant-http";
import { documentRepository } from "./repository";
import { createDocumentService } from "./service";
import { documentStorage } from "./storage";

const service = createDocumentService(documentRepository, documentStorage);

export const createApplicantDocument = createApplicantDocumentHandler({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  clientIp: requestIp,
  findReplay: (principal, unitId, idempotencyKey, fingerprint) => service.findApplicantReplay(principal, unitId, idempotencyKey, fingerprint),
  reserveApplicantUpload: (principal, unitId, ip) => service.reserveApplicantUpload(principal, unitId, ip),
  createApplicant: (principal, reservation, input, idempotencyKey, fingerprint) => service.createApplicant(principal, reservation, input, idempotencyKey, fingerprint),
});
