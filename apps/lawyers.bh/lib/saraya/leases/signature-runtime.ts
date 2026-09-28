import { createLeaseSignatureService } from "./signature-service";
import { leaseSignatureRepository } from "./signature-repository";
import { createContractRenderer } from "./contract-renderer";
import { documentStorage } from "../documents/storage";

export const leaseSignatureService = createLeaseSignatureService(leaseSignatureRepository, createContractRenderer(), documentStorage);
