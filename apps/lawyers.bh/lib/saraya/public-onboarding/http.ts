import { ApiError, apiErrorResponse } from "../auth/contracts";
import { jsonBody, text } from "../auth/http";
import { requestIp, webSessionResponse } from "../auth/security";
import type { PublicOnboardingService } from "./contracts";

function locale(body: Record<string, unknown>) {
  const value = text(body, "locale");
  if (value !== "ar" && value !== "en") {
    throw new ApiError(422, "INVALID_LOCALE", "اللغة غير صالحة", "Invalid locale");
  }
  return value;
}

function channel(body: Record<string, unknown>) {
  const value = text(body, "channel");
  if (value !== "email" && value !== "phone") {
    throw new ApiError(422, "INVALID_CHANNEL", "قناة التحقق غير صالحة", "Invalid verification channel");
  }
  return value;
}

async function safeHandle(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("[saraya-public-onboarding] unhandled error");
    }
    return apiErrorResponse(error);
  }
}

function context(request: Request) {
  return {
    ip: requestIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}

export function createPublicOnboardingHandlers(service: PublicOnboardingService) {
  return {
    challenge(request: Request) {
      return safeHandle(async () => {
        const body = await jsonBody(request);
        const result = await service.requestChallenge({
          channel: channel(body),
          identity: text(body, "identity"),
          locale: locale(body),
        }, context(request));
        return Response.json(result, { status: 202 });
      });
    },

    verify(request: Request) {
      return safeHandle(async () => {
        const body = await jsonBody(request);
        const result = await service.verify({
          challengeId: text(body, "challengeId"),
          code: text(body, "code"),
          displayNameAr: text(body, "displayNameAr"),
          displayNameEn: text(body, "displayNameEn"),
        }, context(request));
        if (request.headers.get("x-saraya-client") === "native") {
          return Response.json(result);
        }
        const sessionResponse = webSessionResponse({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        const sessionBody = await sessionResponse.json() as {
          accessToken: string;
          csrfToken: string;
        };
        return Response.json({
          ...sessionBody,
          userId: result.userId,
          reused: result.reused,
        }, { headers: sessionResponse.headers });
      });
    },
  };
}
