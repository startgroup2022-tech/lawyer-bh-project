import type { SarayaPrincipal } from "../auth/contracts";
import { ApiError } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import type {
  AccountProjection,
  AccountUpdateInput,
  ChangePasswordInput,
} from "./account";

interface AccountService {
  get(userId: string): Promise<AccountProjection>;
  update(userId: string, input: AccountUpdateInput): Promise<AccountProjection>;
  changePassword(
    userId: string,
    sessionId: string,
    input: ChangePasswordInput,
  ): Promise<void>;
}

interface AccountHandlerDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  service: AccountService;
}

const nullableText = (
  body: Record<string, unknown>,
  key: "email" | "phone",
) => {
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "تحقق من الحقول المطلوبة",
      "Check the required fields",
      { [key]: ["INVALID"] },
    );
  }
  return value;
};

const optionalPassword = (body: Record<string, unknown>) => {
  const value = body.currentPassword;
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "تحقق من الحقول المطلوبة",
      "Check the required fields",
      { currentPassword: ["INVALID"] },
    );
  }
  return value;
};

export function createAccountHandlers(deps: AccountHandlerDependencies) {
  return {
    get: (request: Request) =>
      handle(async () => {
        const principal = await deps.authenticate(request);
        return Response.json(await deps.service.get(principal.userId));
      }),

    update: (request: Request) =>
      handle(async () => {
        const principal = await deps.authenticate(request);
        const body = await jsonBody(request);
        const result = await deps.service.update(principal.userId, {
          displayNameAr: text(body, "displayNameAr"),
          displayNameEn: text(body, "displayNameEn"),
          email: nullableText(body, "email"),
          phone: nullableText(body, "phone"),
          currentPassword: optionalPassword(body),
        });
        return Response.json(result);
      }),

    changePassword: (request: Request) =>
      handle(async () => {
        const principal = await deps.authenticate(request);
        const body = await jsonBody(request);
        await deps.service.changePassword(principal.userId, principal.sessionId, {
          currentPassword: text(body, "currentPassword"),
          newPassword: text(body, "newPassword"),
        });
        return new Response(null, { status: 204 });
      }),
  };
}
