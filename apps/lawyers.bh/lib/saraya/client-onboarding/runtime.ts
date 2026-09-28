import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { createClientOnboardingHandlers } from "./http";
import { clientOnboardingRepository } from "./repository";
import { createClientOnboardingService } from "./service";

const service = createClientOnboardingService(clientOnboardingRepository);

export const clientOnboardingHandlers = createClientOnboardingHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  options: service.options,
  createTenant: service.createTenant,
  createOwner: service.createOwner,
});
