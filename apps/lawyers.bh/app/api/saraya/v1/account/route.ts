import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createAccountHandlers } from "@/lib/saraya/account/handlers";
import { accountService } from "@/lib/saraya/account/runtime";

const handlers = () =>
  createAccountHandlers({
    authenticate: (request) => requireSarayaPrincipal(request, sessions()),
    service: accountService(),
  });

export const GET = (request: Request) => handlers().get(request);
export const PATCH = (request: Request) => handlers().update(request);
