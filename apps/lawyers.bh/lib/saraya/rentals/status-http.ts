import type { SarayaPrincipal } from "../auth/contracts";
import { handle } from "../auth/http";

export function createRentalStatusHandler(dependencies: {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  read(principal: SarayaPrincipal, requestId: string): Promise<unknown>;
}) {
  return (request: Request, requestId: string) => handle(async () =>
    Response.json(await dependencies.read(await dependencies.authenticate(request), requestId)));
}
