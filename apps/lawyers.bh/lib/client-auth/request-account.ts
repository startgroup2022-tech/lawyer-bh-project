import { bearerToken } from "./http";
import { ClientAuthError } from "./validation";

type ClientAccount = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
};

type ResolveSession = (token: string) => Promise<ClientAccount | null>;

async function resolveSession(token: string) {
  const { clientAuthService } = await import("./runtime");
  return clientAuthService().session(token);
}

export async function resolveOptionalClientAccount(
  request: Request,
  session: ResolveSession = resolveSession,
): Promise<{ id: string } | null> {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return null;

  const token = bearerToken(request);
  if (!token) throw new ClientAuthError("unauthorized", 401);

  const account = await session(token);
  if (!account) throw new ClientAuthError("unauthorized", 401);

  return { id: account.id };
}
