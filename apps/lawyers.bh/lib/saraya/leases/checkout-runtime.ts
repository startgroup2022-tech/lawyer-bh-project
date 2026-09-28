import { createLeaseCheckoutService } from "./checkout-service";
import { leaseCheckoutRepository } from "./checkout-repository";

export const leaseCheckoutService = createLeaseCheckoutService(leaseCheckoutRepository);
