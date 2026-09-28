import { createContractRenderer, type ContractRenderer, type ContractSnapshot } from "./contract-renderer";

export interface LeaseCheckoutRepository {
  createForPaidRequest(propertyId: string, requestId: string, build: (snapshot: ContractSnapshot) => Promise<{ bytes: Uint8Array; leaseChecksum: string; documentChecksum: string }>): Promise<{ leaseId: string; checksum: string }>;
}

export function createLeaseCheckoutService(repository: LeaseCheckoutRepository, renderer: ContractRenderer = createContractRenderer()) {
  return {
    createForPaidRequest(propertyId: string, requestId: string) {
      return repository.createForPaidRequest(propertyId, requestId, (snapshot) => renderer.render(snapshot));
    },
  };
}
