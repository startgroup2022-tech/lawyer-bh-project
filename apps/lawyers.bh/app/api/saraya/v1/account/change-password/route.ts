import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createAccountHandlers } from "@/lib/saraya/account/handlers";
import { accountService } from "@/lib/saraya/account/runtime";

export async function POST(request: Request) {
  return createAccountHandlers({
    authenticate: (value) => requireSarayaPrincipal(value, sessions()),
    service: accountService(),
  }).changePassword(request);
}
